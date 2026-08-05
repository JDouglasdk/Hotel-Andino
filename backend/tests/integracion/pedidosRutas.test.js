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

async function crearHuespedYPlato(adminAgente) {
  // tipoHuesped 'vip' (3 franjas/día) a propósito: varios tests de este
  // archivo crean 2 pedidos en franjas distintas para el mismo huésped
  // (no están probando la regla de derecho de comidas, están probando
  // filtros/transiciones — un huésped permisivo evita que choquen).
  const huesped = await adminAgente.post('/api/huespedes').send({ documento: '111111', nombreCompleto: 'Carlos Ruiz', tipoHuesped: 'vip' });
  const categoria = await adminAgente.post('/api/categorias').send({ nombre: 'Entradas' });
  const plato = await adminAgente.post('/api/platos').send({ categoriaId: categoria.body.id, nombre: 'Empanadas', precio: 8000 });
  const ingrediente = await adminAgente.post('/api/ingredientes').send({ nombre: 'Harina', cantidadStock: 1000, unidadMedida: 'kg' });
  await adminAgente.post(`/api/platos/${plato.body.id}/receta`).send({ items: [{ ingredienteId: ingrediente.body.id, cantidadRequerida: 1 }] });
  return { huesped: huesped.body, plato: plato.body };
}

test('mesero puede crear un pedido con éxito', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped, plato } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const respuesta = await meseroAgente.post('/api/pedidos').send({
    huespedId: huesped.id,
    franja: 'almuerzo',
    items: [{ platoId: plato.id, cantidad: 2 }],
  });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.estado, 'pendiente');
  assert.equal(respuesta.body.items.length, 1);
  assert.equal(respuesta.body.items[0].precioUnitario, 8000);
});

test('crear un pedido con huésped inexistente responde 404', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { plato } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const respuesta = await meseroAgente.post('/api/pedidos').send({
    huespedId: 9999,
    franja: 'almuerzo',
    items: [{ platoId: plato.id, cantidad: 1 }],
  });

  assert.equal(respuesta.status, 404);
  assert.equal(respuesta.body.error.codigo, 'HUESPED_NO_ENCONTRADO');
});

test('crear un pedido con plato inexistente responde 404', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const respuesta = await meseroAgente.post('/api/pedidos').send({
    huespedId: huesped.id,
    franja: 'almuerzo',
    items: [{ platoId: 9999, cantidad: 1 }],
  });

  assert.equal(respuesta.status, 404);
  assert.equal(respuesta.body.error.codigo, 'PLATO_NO_ENCONTRADO');
});

test('crear un pedido con plato no disponible responde 409', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped, plato } = await crearHuespedYPlato(adminAgente);
  await adminAgente.patch(`/api/platos/${plato.id}/disponibilidad`).send({ disponible: false });
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const respuesta = await meseroAgente.post('/api/pedidos').send({
    huespedId: huesped.id,
    franja: 'almuerzo',
    items: [{ platoId: plato.id, cantidad: 1 }],
  });

  assert.equal(respuesta.status, 409);
  assert.equal(respuesta.body.error.codigo, 'PLATO_NO_DISPONIBLE');
});

test('crear un pedido sin items responde 422', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const respuesta = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'almuerzo', items: [] });

  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.body.error.codigo, 'DATOS_INVALIDOS');
});

test('un usuario no-mesero recibe 403 al intentar crear un pedido', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped, plato } = await crearHuespedYPlato(adminAgente);
  const cocinaAgente = await iniciarSesionRol(app, contenedor, 'cocina', 'cocina@hotelandino.com');

  const respuesta = await cocinaAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'almuerzo', items: [{ platoId: plato.id, cantidad: 1 }] });

  assert.equal(respuesta.status, 403);
});

test('secuencia completa de transiciones respeta el rol de cada paso', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped, plato } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');
  const cocinaAgente = await iniciarSesionRol(app, contenedor, 'cocina', 'cocina@hotelandino.com');

  const creado = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'almuerzo', items: [{ platoId: plato.id, cantidad: 1 }] });
  const pedidoId = creado.body.id;

  const enPreparacion = await cocinaAgente.patch(`/api/pedidos/${pedidoId}/estado`).send({ estado: 'en_preparacion' });
  assert.equal(enPreparacion.status, 200);
  assert.equal(enPreparacion.body.estado, 'en_preparacion');

  const listo = await cocinaAgente.patch(`/api/pedidos/${pedidoId}/estado`).send({ estado: 'listo' });
  assert.equal(listo.status, 200);
  assert.equal(listo.body.estado, 'listo');

  const entregado = await meseroAgente.patch(`/api/pedidos/${pedidoId}/estado`).send({ estado: 'entregado' });
  assert.equal(entregado.status, 200);
  assert.equal(entregado.body.estado, 'entregado');
});

test('mesero intentando pendiente->en_preparacion recibe 403', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped, plato } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const creado = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'almuerzo', items: [{ platoId: plato.id, cantidad: 1 }] });

  const respuesta = await meseroAgente.patch(`/api/pedidos/${creado.body.id}/estado`).send({ estado: 'en_preparacion' });

  assert.equal(respuesta.status, 403);
  assert.equal(respuesta.body.error.codigo, 'NO_AUTORIZADO');
});

test('cancelar un pedido desde pendiente', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped, plato } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const creado = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'almuerzo', items: [{ platoId: plato.id, cantidad: 1 }] });

  const respuesta = await meseroAgente.patch(`/api/pedidos/${creado.body.id}/estado`).send({ estado: 'cancelado' });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.estado, 'cancelado');
});

test('cancelar un pedido desde en_preparacion', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped, plato } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');
  const cocinaAgente = await iniciarSesionRol(app, contenedor, 'cocina', 'cocina@hotelandino.com');

  const creado = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'almuerzo', items: [{ platoId: plato.id, cantidad: 1 }] });
  await cocinaAgente.patch(`/api/pedidos/${creado.body.id}/estado`).send({ estado: 'en_preparacion' });

  const respuesta = await cocinaAgente.patch(`/api/pedidos/${creado.body.id}/estado`).send({ estado: 'cancelado' });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.estado, 'cancelado');
});

test('transición inválida (listo->pendiente) responde 409', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped, plato } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');
  const cocinaAgente = await iniciarSesionRol(app, contenedor, 'cocina', 'cocina@hotelandino.com');

  const creado = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'almuerzo', items: [{ platoId: plato.id, cantidad: 1 }] });
  await cocinaAgente.patch(`/api/pedidos/${creado.body.id}/estado`).send({ estado: 'en_preparacion' });
  await cocinaAgente.patch(`/api/pedidos/${creado.body.id}/estado`).send({ estado: 'listo' });

  const respuesta = await cocinaAgente.patch(`/api/pedidos/${creado.body.id}/estado`).send({ estado: 'pendiente' });

  assert.equal(respuesta.status, 409);
  assert.equal(respuesta.body.error.codigo, 'TRANSICION_INVALIDA');
});

test('GET /api/pedidos filtra por estado', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped, plato } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');
  const cocinaAgente = await iniciarSesionRol(app, contenedor, 'cocina', 'cocina@hotelandino.com');

  const pedido1 = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'almuerzo', items: [{ platoId: plato.id, cantidad: 1 }] });
  await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'cena', items: [{ platoId: plato.id, cantidad: 1 }] });
  await cocinaAgente.patch(`/api/pedidos/${pedido1.body.id}/estado`).send({ estado: 'en_preparacion' });

  const respuesta = await meseroAgente.get('/api/pedidos?estado=en_preparacion');

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.length, 1);
  assert.equal(respuesta.body[0].id, pedido1.body.id);
});

test('GET /api/pedidos/:id devuelve el pedido con sus items', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped, plato } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const creado = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'almuerzo', items: [{ platoId: plato.id, cantidad: 1 }] });

  const respuesta = await meseroAgente.get(`/api/pedidos/${creado.body.id}`);

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.id, creado.body.id);
  assert.equal(Array.isArray(respuesta.body.items), true);
  assert.equal(respuesta.body.items.length > 0, true);
});

test('GET /api/pedidos/:id con id inexistente responde 404', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const respuesta = await meseroAgente.get('/api/pedidos/9999');

  assert.equal(respuesta.status, 404);
  assert.equal(respuesta.body.error.codigo, 'NO_ENCONTRADO');
});

test('PATCH /api/pedidos/:id/estado con id inexistente responde 404', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const respuesta = await meseroAgente.patch('/api/pedidos/9999/estado').send({ estado: 'en_preparacion' });

  assert.equal(respuesta.status, 404);
  assert.equal(respuesta.body.error.codigo, 'NO_ENCONTRADO');
});

test('GET /api/pedidos filtra por franja', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const { huesped, plato } = await crearHuespedYPlato(adminAgente);
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'desayuno', items: [{ platoId: plato.id, cantidad: 1 }] });
  const pedidoCena = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.id, franja: 'cena', items: [{ platoId: plato.id, cantidad: 1 }] });

  const respuesta = await meseroAgente.get('/api/pedidos?franja=cena');

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.length, 1);
  assert.equal(respuesta.body[0].id, pedidoCena.body.id);
});

test('ordinario es bloqueado al pedir una segunda franja distinta el mismo día', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const huesped = await adminAgente.post('/api/huespedes').send({ documento: '222222', nombreCompleto: 'Ana Gómez', tipoHuesped: 'ordinario' });
  const categoria = await adminAgente.post('/api/categorias').send({ nombre: 'Entradas' });
  const plato = await adminAgente.post('/api/platos').send({ categoriaId: categoria.body.id, nombre: 'Sopa', precio: 5000 });
  const ingrediente = await adminAgente.post('/api/ingredientes').send({ nombre: 'Verdura', cantidadStock: 1000, unidadMedida: 'kg' });
  await adminAgente.post(`/api/platos/${plato.body.id}/receta`).send({ items: [{ ingredienteId: ingrediente.body.id, cantidadRequerida: 1 }] });
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja: 'desayuno', items: [{ platoId: plato.body.id, cantidad: 1 }] });
  const respuesta = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja: 'almuerzo', items: [{ platoId: plato.body.id, cantidad: 1 }] });

  assert.equal(respuesta.status, 409);
  assert.equal(respuesta.body.error.codigo, 'DERECHO_COMIDAS_EXCEDIDO');
});

test('ordinario puede repetir un pedido en la misma franja sin exceder su derecho', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const huesped = await adminAgente.post('/api/huespedes').send({ documento: '444444', nombreCompleto: 'Pedro Ruiz', tipoHuesped: 'ordinario' });
  const categoria = await adminAgente.post('/api/categorias').send({ nombre: 'Entradas' });
  const plato = await adminAgente.post('/api/platos').send({ categoriaId: categoria.body.id, nombre: 'Sopa', precio: 5000 });
  const ingrediente = await adminAgente.post('/api/ingredientes').send({ nombre: 'Verdura', cantidadStock: 1000, unidadMedida: 'kg' });
  await adminAgente.post(`/api/platos/${plato.body.id}/receta`).send({ items: [{ ingredienteId: ingrediente.body.id, cantidadRequerida: 1 }] });
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const primero = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja: 'desayuno', items: [{ platoId: plato.body.id, cantidad: 1 }] });
  const segundo = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja: 'desayuno', items: [{ platoId: plato.body.id, cantidad: 1 }] });

  assert.equal(primero.status, 201);
  assert.equal(segundo.status, 201);
});

test('vip puede pedir en sus 3 franjas distintas el mismo día', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const huesped = await adminAgente.post('/api/huespedes').send({ documento: '555555', nombreCompleto: 'Luisa Vip', tipoHuesped: 'vip' });
  const categoria = await adminAgente.post('/api/categorias').send({ nombre: 'Entradas' });
  const plato = await adminAgente.post('/api/platos').send({ categoriaId: categoria.body.id, nombre: 'Sopa', precio: 5000 });
  const ingrediente = await adminAgente.post('/api/ingredientes').send({ nombre: 'Verdura', cantidadStock: 1000, unidadMedida: 'kg' });
  await adminAgente.post(`/api/platos/${plato.body.id}/receta`).send({ items: [{ ingredienteId: ingrediente.body.id, cantidadRequerida: 1 }] });
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  for (const franja of ['desayuno', 'almuerzo', 'cena']) {
    const respuesta = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja, items: [{ platoId: plato.body.id, cantidad: 1 }] });
    assert.equal(respuesta.status, 201);
  }
});

test('vip puede repetir una franja ya usada incluso después de agotar sus 3 franjas', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const huesped = await adminAgente.post('/api/huespedes').send({ documento: '999999', nombreCompleto: 'Sofia Vip', tipoHuesped: 'vip' });
  const categoria = await adminAgente.post('/api/categorias').send({ nombre: 'Entradas' });
  const plato = await adminAgente.post('/api/platos').send({ categoriaId: categoria.body.id, nombre: 'Sopa', precio: 5000 });
  const ingrediente = await adminAgente.post('/api/ingredientes').send({ nombre: 'Verdura', cantidadStock: 1000, unidadMedida: 'kg' });
  await adminAgente.post(`/api/platos/${plato.body.id}/receta`).send({ items: [{ ingredienteId: ingrediente.body.id, cantidadRequerida: 1 }] });
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  for (const franja of ['desayuno', 'almuerzo', 'cena']) {
    const respuesta = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja, items: [{ platoId: plato.body.id, cantidad: 1 }] });
    assert.equal(respuesta.status, 201);
  }

  // Las 3 franjas ya están usadas hoy. Repetir 'desayuno' NO debe bloquearse
  // — repetir una franja nunca cuenta contra el límite, sin excepción,
  // incluso cuando ya no queda ninguna franja nueva por usar. Este es el
  // caso exacto que motivó simplificar la regla en derechoDeComidasServicio
  // (se descartó un chequeo redundante que bloqueaba todo una vez usadas
  // las 3 franjas — ver docs/superpowers/specs/2026-08-04-inventario-derecho-comidas-reportes-design.md).
  const respuesta = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja: 'desayuno', items: [{ platoId: plato.body.id, cantidad: 1 }] });

  assert.equal(respuesta.status, 201);
});

test('cancelar un pedido libera esa franja para el límite de comidas', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const huesped = await adminAgente.post('/api/huespedes').send({ documento: '666666', nombreCompleto: 'Marta Ruiz', tipoHuesped: 'ordinario' });
  const categoria = await adminAgente.post('/api/categorias').send({ nombre: 'Entradas' });
  const plato = await adminAgente.post('/api/platos').send({ categoriaId: categoria.body.id, nombre: 'Sopa', precio: 5000 });
  const ingrediente = await adminAgente.post('/api/ingredientes').send({ nombre: 'Verdura', cantidadStock: 1000, unidadMedida: 'kg' });
  await adminAgente.post(`/api/platos/${plato.body.id}/receta`).send({ items: [{ ingredienteId: ingrediente.body.id, cantidadRequerida: 1 }] });
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const primero = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja: 'desayuno', items: [{ platoId: plato.body.id, cantidad: 1 }] });
  await meseroAgente.patch(`/api/pedidos/${primero.body.id}/estado`).send({ estado: 'cancelado' });

  const respuesta = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja: 'almuerzo', items: [{ platoId: plato.body.id, cantidad: 1 }] });

  assert.equal(respuesta.status, 201);
});

test('crear un pedido descuenta el stock según la receta', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const huesped = await adminAgente.post('/api/huespedes').send({ documento: '777777', nombreCompleto: 'Jorge Ruiz', tipoHuesped: 'vip' });
  const categoria = await adminAgente.post('/api/categorias').send({ nombre: 'Entradas' });
  const plato = await adminAgente.post('/api/platos').send({ categoriaId: categoria.body.id, nombre: 'Sopa', precio: 5000 });
  const ingrediente = await adminAgente.post('/api/ingredientes').send({ nombre: 'Verdura', cantidadStock: 10, unidadMedida: 'kg' });
  await adminAgente.post(`/api/platos/${plato.body.id}/receta`).send({ items: [{ ingredienteId: ingrediente.body.id, cantidadRequerida: 2 }] });
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja: 'almuerzo', items: [{ platoId: plato.body.id, cantidad: 3 }] });

  const ingredientes = await adminAgente.get('/api/ingredientes');
  const actualizado = ingredientes.body.find((i) => i.id === ingrediente.body.id);
  assert.equal(actualizado.cantidadStock, 4); // 10 - (2 * 3)
});

test('crear un pedido con stock insuficiente responde 409 STOCK_INSUFICIENTE', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const huesped = await adminAgente.post('/api/huespedes').send({ documento: '888888', nombreCompleto: 'Elena Ruiz', tipoHuesped: 'vip' });
  const categoria = await adminAgente.post('/api/categorias').send({ nombre: 'Entradas' });
  const plato = await adminAgente.post('/api/platos').send({ categoriaId: categoria.body.id, nombre: 'Sopa', precio: 5000 });
  const ingrediente = await adminAgente.post('/api/ingredientes').send({ nombre: 'Verdura', cantidadStock: 1, unidadMedida: 'kg' });
  await adminAgente.post(`/api/platos/${plato.body.id}/receta`).send({ items: [{ ingredienteId: ingrediente.body.id, cantidadRequerida: 1 }] });
  const meseroAgente = await iniciarSesionRol(app, contenedor, 'mesero', 'mesero@hotelandino.com');

  const respuesta = await meseroAgente.post('/api/pedidos').send({ huespedId: huesped.body.id, franja: 'almuerzo', items: [{ platoId: plato.body.id, cantidad: 5 }] });

  assert.equal(respuesta.status, 409);
  assert.equal(respuesta.body.error.codigo, 'STOCK_INSUFICIENTE');

  // Limitación conocida y documentada (ver docs/decisiones.md): el pedido
  // ya se había creado y comprometido en su propia transacción antes de
  // que el descuento de inventario fallara — queda persistido en
  // pendiente, sin inventario descontado. No es un bug de este plan.
  const pedidos = await meseroAgente.get('/api/pedidos?estado=pendiente');
  assert.ok(pedidos.body.some((p) => p.huespedId === huesped.body.id));
});
