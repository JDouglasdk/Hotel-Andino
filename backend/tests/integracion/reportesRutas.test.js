const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { crearAppDePrueba } = require('../ayudas/appDePrueba');
const { crearUsuarioDePrueba } = require('../ayudas/usuariosDePrueba');

async function iniciarSesionAdmin(app) {
  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ correo: 'admin@hotelandino.com', contrasena: 'Admin123!' });
  return agente;
}

async function iniciarSesionRol(app, contenedor, rol, correo) {
  crearUsuarioDePrueba(contenedor, { nombreCompleto: 'Persona', correo, contrasena: 'clave123', rol });
  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ correo, contrasena: 'clave123' });
  return agente;
}

async function crearPedidoEntregado(adminAgente, contenedor, app, { documento, franja, precio, cantidad }) {
  const huesped = await adminAgente.post('/api/huespedes').send({ documento, nombreCompleto: 'Cliente Prueba', tipoHuesped: 'vip' });
  const categoria = await adminAgente.post('/api/categorias').send({ nombre: `Cat-${documento}` });
  const plato = await adminAgente.post('/api/platos').send({ categoriaId: categoria.body.id, nombre: `Plato-${documento}`, precio });
  const ingrediente = await adminAgente.post('/api/ingredientes').send({ nombre: `Ingrediente-${documento}`, cantidadStock: 1000, unidadMedida: 'kg' });
  await adminAgente.post(`/api/platos/${plato.body.id}/receta`).send({ items: [{ ingredienteId: ingrediente.body.id, cantidadRequerida: 1 }] });

  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', `mesero-${documento}@hotelandino.com`);
  const cocinaAgente = await iniciarSesionRol(app, contenedor, 'cocina', `cocina-${documento}@hotelandino.com`);

  const pedido = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja, items: [{ platoId: plato.body.id, cantidad }] });
  await cocinaAgente.patch(`/api/pedidos/${pedido.body.id}/estado`).send({ estado: 'en_preparacion' });
  await cocinaAgente.patch(`/api/pedidos/${pedido.body.id}/estado`).send({ estado: 'listo' });
  await meseroAgente.patch(`/api/pedidos/${pedido.body.id}/estado`).send({ estado: 'entregado' });

  return { plato: plato.body };
}

test('jefeDeCaja puede ver la caja del día', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  await crearPedidoEntregado(adminAgente, contenedor, app, { documento: '900001', franja: 'almuerzo', precio: 10000, cantidad: 2 });

  const jefeAgente = await iniciarSesionRol(app, contenedor, 'jefeDeCaja', 'jefe@hotelandino.com');
  const respuesta = await jefeAgente.get('/api/reportes/caja-del-dia');

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.total, 20000);
  assert.equal(respuesta.body.cantidadPedidos, 1);
});

test('caja del día no cuenta pedidos pendientes', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const huesped = await adminAgente.post('/api/huespedes').send({ documento: '900002', nombreCompleto: 'Cliente Pendiente', tipoHuesped: 'vip' });
  const categoria = await adminAgente.post('/api/categorias').send({ nombre: 'Cat-Pend' });
  const plato = await adminAgente.post('/api/platos').send({ categoriaId: categoria.body.id, nombre: 'Plato Pend', precio: 10000 });
  const ingrediente = await adminAgente.post('/api/ingredientes').send({ nombre: 'Ing Pend', cantidadStock: 1000, unidadMedida: 'kg' });
  await adminAgente.post(`/api/platos/${plato.body.id}/receta`).send({ items: [{ ingredienteId: ingrediente.body.id, cantidadRequerida: 1 }] });
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero-pend@hotelandino.com');
  await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja: 'almuerzo', items: [{ platoId: plato.body.id, cantidad: 1 }] });

  const jefeAgente = await iniciarSesionRol(app, contenedor, 'jefeDeCaja', 'jefe2@hotelandino.com');
  const respuesta = await jefeAgente.get('/api/reportes/caja-del-dia');

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.total, 0);
  assert.equal(respuesta.body.cantidadPedidos, 0);
});

test('un usuario no autorizado (mesero) recibe 403 al ver la caja del día', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero3@hotelandino.com');

  const respuesta = await meseroAgente.get('/api/reportes/caja-del-dia');

  assert.equal(respuesta.status, 403);
});

test('platos por franja agrupa los platos servidos', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { plato } = await crearPedidoEntregado(adminAgente, contenedor, app, { documento: '900003', franja: 'cena', precio: 12000, cantidad: 4 });

  const jefeAgente = await iniciarSesionRol(app, contenedor, 'jefeDeCaja', 'jefe4@hotelandino.com');
  const respuesta = await jefeAgente.get('/api/reportes/platos-por-franja');

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.cena[plato.id], 4);
});
