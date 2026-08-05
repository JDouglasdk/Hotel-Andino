const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { crearConexion } = require('../../src/db/conexion');
const { aplicarMigraciones } = require('../../src/db/migraciones/migrar');
const { crearContenedor } = require('../../src/contenedor');
const { crearApp } = require('../../src/app');

// Prueba de integración de punta a punta contra la app Express real (con
// una BD SQLite en memoria), tal como está montada en app.js/contenedor.js.
// Cubre login por rol, alta mínima de catálogo, la comanda completa (con
// validación de derecho de comidas + descuento de inventario) y la caja
// diaria — el recorrido central del reto descrito en docs/decisiones.md.
function crearAppDePrueba() {
  const conexion = crearConexion(':memory:');
  aplicarMigraciones(conexion);
  const contenedor = crearContenedor(conexion);
  return crearApp(contenedor, { rutaSesionesDb: ':memory:' });
}

async function iniciarSesion(agente, correo, contrasena) {
  return agente.post('/api/auth/login').send({ correo, contrasena });
}

test('flujo completo: login, catálogo, comanda y caja diaria', async () => {
  const app = crearAppDePrueba();
  const admin = request.agent(app);

  // 1. Login con el admin semilla (ver migración 009).
  const loginAdmin = await iniciarSesion(admin, 'admin@hotelandino.com', 'Admin123!');
  assert.equal(loginAdmin.status, 200);
  assert.equal(loginAdmin.body.usuario.rol, 'admin');

  // 2. Alta de personal: un mesero, un cocinero y un jefe de caja.
  const altaMesero = await admin
    .post('/api/usuarios')
    .send({ nombreCompleto: 'Mesero Uno', correo: 'mesero@hotelandino.com', contrasena: 'Clave1234', rol: 'mesero' });
  assert.equal(altaMesero.status, 201);

  await admin
    .post('/api/usuarios')
    .send({ nombreCompleto: 'Cocinero Uno', correo: 'cocina@hotelandino.com', contrasena: 'Clave1234', rol: 'cocina' })
    .expect(201);

  await admin
    .post('/api/usuarios')
    .send({ nombreCompleto: 'Caja Uno', correo: 'caja@hotelandino.com', contrasena: 'Clave1234', rol: 'jefeDeCaja' })
    .expect(201);

  // 3. Alta de catálogo: categoría, ingrediente con stock, plato con receta.
  const categoria = await admin.post('/api/categorias').send({ nombre: 'Fondos' }).expect(201);
  const ingrediente = await admin
    .post('/api/ingredientes')
    .send({ nombre: 'Arroz', cantidadStock: 100, unidadMedida: 'kg' })
    .expect(201);
  const plato = await admin
    .post('/api/platos')
    .send({
      categoriaId: categoria.body.categoria.id,
      nombre: 'Arroz con pollo',
      precio: 25000,
      receta: [{ ingredienteId: ingrediente.body.ingrediente.id, cantidadRequerida: 2 }],
    })
    .expect(201);

  // 4. Alta de huésped.
  const huesped = await admin
    .post('/api/huespedes')
    .send({ documento: 'CC-1', nombreCompleto: 'Huésped de Prueba', tipoHuesped: 'ejecutivo' })
    .expect(201);

  // 5. El mesero registra la comanda.
  const mesero = request.agent(app);
  await iniciarSesion(mesero, 'mesero@hotelandino.com', 'Clave1234').then((r) => assert.equal(r.status, 200));

  const pedido = await mesero
    .post('/api/pedidos')
    .send({
      huespedId: huesped.body.huesped.id,
      franja: 'almuerzo',
      items: [{ platoId: plato.body.plato.id, cantidad: 2 }],
    });
  assert.equal(pedido.status, 201);
  assert.equal(pedido.body.pedido.estado, 'pendiente');

  // El inventario debe reflejar el descuento: 100 - (2 kg receta * 2 unidades) = 96.
  const ingredientesTrasPedido = await admin.get('/api/ingredientes').expect(200);
  const arrozActualizado = ingredientesTrasPedido.body.ingredientes.find((i) => i.id === ingrediente.body.ingrediente.id);
  assert.equal(arrozActualizado.cantidad_stock, 96);

  // 6. Cocina avanza el estado, el mesero entrega.
  const cocina = request.agent(app);
  await iniciarSesion(cocina, 'cocina@hotelandino.com', 'Clave1234').then((r) => assert.equal(r.status, 200));

  await cocina.patch(`/api/pedidos/${pedido.body.pedido.id}/estado`).send({ estado: 'en_preparacion' }).expect(200);
  await cocina.patch(`/api/pedidos/${pedido.body.pedido.id}/estado`).send({ estado: 'listo' }).expect(200);
  const entregado = await mesero
    .patch(`/api/pedidos/${pedido.body.pedido.id}/estado`)
    .send({ estado: 'entregado' })
    .expect(200);
  assert.equal(entregado.body.pedido.estado, 'entregado');

  // 7. Un segundo pedido en la misma franja ya consumida hoy debe rechazarse
  // por derecho de comidas (ejecutivo = 2 franjas/día; probamos una tercera).
  await mesero
    .post('/api/pedidos')
    .send({ huespedId: huesped.body.huesped.id, franja: 'desayuno', items: [{ platoId: plato.body.plato.id, cantidad: 1 }] })
    .expect(201);

  const tercerPedido = await mesero
    .post('/api/pedidos')
    .send({ huespedId: huesped.body.huesped.id, franja: 'cena', items: [{ platoId: plato.body.plato.id, cantidad: 1 }] });
  assert.equal(tercerPedido.status, 409);
  assert.equal(tercerPedido.body.error.codigo, 'LIMITE_COMIDAS_EXCEDIDO');

  // 8. Jefe de caja consulta la caja diaria: solo debe contar el entregado.
  const jefeDeCaja = request.agent(app);
  await iniciarSesion(jefeDeCaja, 'caja@hotelandino.com', 'Clave1234').then((r) => assert.equal(r.status, 200));

  const caja = await jefeDeCaja.get('/api/reportes/caja-diaria').expect(200);
  assert.equal(caja.body.caja.total, 50000); // 2 unidades * 25000, el pendiente no cuenta

  // 9. Autorización: mesero no puede consultar la caja diaria.
  await mesero.get('/api/reportes/caja-diaria').expect(403);

  // 10. Logout invalida la sesión.
  await admin.post('/api/auth/logout').expect(204);
  await admin.get('/api/huespedes').expect(401);
});

test('login con credenciales incorrectas devuelve 401 sin revelar la causa', async () => {
  const app = crearAppDePrueba();
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: 'admin@hotelandino.com', contrasena: 'clave-equivocada' });

  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.body.error.codigo, 'CREDENCIALES_INVALIDAS');
});

test('rutas de negocio exigen sesión', async () => {
  const app = crearAppDePrueba();
  const respuesta = await request(app).get('/api/huespedes');
  assert.equal(respuesta.status, 401);
});
