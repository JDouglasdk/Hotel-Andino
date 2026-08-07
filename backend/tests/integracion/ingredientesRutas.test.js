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

test('admin puede crear un ingrediente', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.nombre, 'Papa');
  assert.equal(respuesta.body.cantidadStock, 50);
});

test('un usuario no-admin recibe 403 al intentar crear un ingrediente', async () => {
  const { app, contenedor } = crearAppDePrueba();
  crearUsuarioDePrueba(contenedor, { nombreCompleto: 'Beto', correo: 'beto@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });
  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ correo: 'beto@hotelandino.com', contrasena: 'clave123' });

  const respuesta = await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });

  assert.equal(respuesta.status, 403);
});

test('crear un ingrediente con nombre duplicado responde 409', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });

  const respuesta = await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 10, unidadMedida: 'kg' });

  assert.equal(respuesta.status, 409);
  assert.equal(respuesta.body.error.codigo, 'INGREDIENTE_DUPLICADO');
});

test('crear un ingrediente con datos inválidos responde 422', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.post('/api/ingredientes').send({ nombre: '', cantidadStock: 50, unidadMedida: 'kg' });

  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.body.error.codigo, 'DATOS_INVALIDOS');
});

test('GET /api/ingredientes lista los ingredientes', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });

  const respuesta = await agente.get('/api/ingredientes');

  assert.equal(respuesta.status, 200);
  assert.ok(Array.isArray(respuesta.body));
  assert.ok(respuesta.body.some((i) => i.nombre === 'Papa'));
});

test('admin registra un movimiento de compra y el stock resultante sube', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const creado = await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });

  const respuesta = await agente.post(`/api/ingredientes/${creado.body.id}/movimientos`).send({ delta: 30, motivo: 'compra' });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.delta, 30);
  assert.equal(respuesta.body.motivo, 'compra');
  assert.equal(respuesta.body.cantidadResultante, 80);

  const ingredientes = await agente.get('/api/ingredientes');
  assert.equal(ingredientes.body.find((i) => i.id === creado.body.id).cantidadStock, 80);
});

test('un movimiento de merma mayor al stock disponible responde 409 STOCK_INSUFICIENTE', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const creado = await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 5, unidadMedida: 'kg' });

  const respuesta = await agente.post(`/api/ingredientes/${creado.body.id}/movimientos`).send({ delta: -10, motivo: 'merma' });

  assert.equal(respuesta.status, 409);
  assert.equal(respuesta.body.error.codigo, 'STOCK_INSUFICIENTE');
});

test('un movimiento con delta 0 responde 422', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const creado = await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });

  const respuesta = await agente.post(`/api/ingredientes/${creado.body.id}/movimientos`).send({ delta: 0, motivo: 'ajuste' });

  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.body.error.codigo, 'DATOS_INVALIDOS');
});

test('un motivo fuera del enum manual (ej. consumo_comanda) responde 422', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const creado = await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });

  const respuesta = await agente.post(`/api/ingredientes/${creado.body.id}/movimientos`).send({ delta: 5, motivo: 'consumo_comanda' });

  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.body.error.codigo, 'DATOS_INVALIDOS');
});

test('un usuario no-admin recibe 403 al intentar registrar un movimiento', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const adminAgente = await iniciarSesionAdmin(app);
  const creado = await adminAgente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });
  crearUsuarioDePrueba(contenedor, { nombreCompleto: 'Beto', correo: 'beto@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });
  const meseroAgente = request.agent(app);
  await meseroAgente.post('/api/auth/login').send({ correo: 'beto@hotelandino.com', contrasena: 'clave123' });

  const respuesta = await meseroAgente.post(`/api/ingredientes/${creado.body.id}/movimientos`).send({ delta: 10, motivo: 'compra' });

  assert.equal(respuesta.status, 403);
});

test('registrar un movimiento de un ingrediente inexistente responde 404', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.post('/api/ingredientes/9999/movimientos').send({ delta: 10, motivo: 'compra' });

  assert.equal(respuesta.status, 404);
  assert.equal(respuesta.body.error.codigo, 'INGREDIENTE_NO_ENCONTRADO');
});

test('GET .../movimientos devuelve el historial más reciente primero con el resultante correcto', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const creado = await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });

  await agente.post(`/api/ingredientes/${creado.body.id}/movimientos`).send({ delta: 10, motivo: 'compra' });
  await agente.post(`/api/ingredientes/${creado.body.id}/movimientos`).send({ delta: -5, motivo: 'merma' });

  const respuesta = await agente.get(`/api/ingredientes/${creado.body.id}/movimientos`);

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.length, 2);
  assert.equal(respuesta.body[0].motivo, 'merma');
  assert.equal(respuesta.body[0].cantidadResultante, 55);
  assert.equal(respuesta.body[0].usuarioNombre, 'Administrador');
  assert.equal(respuesta.body[1].motivo, 'compra');
  assert.equal(respuesta.body[1].cantidadResultante, 60);
});

test('GET .../movimientos de un ingrediente inexistente responde 404', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.get('/api/ingredientes/9999/movimientos');

  assert.equal(respuesta.status, 404);
  assert.equal(respuesta.body.error.codigo, 'INGREDIENTE_NO_ENCONTRADO');
});

test('crear un ingrediente asigna creadoPor y creadoEn', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const yo = await agente.get('/api/auth/yo');

  const respuesta = await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.creadoPor, yo.body.id);
  assert.ok(respuesta.body.creadoEn);
});

test('registrar un movimiento de stock NO agrega actualizadoPor al ingrediente', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const creado = await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });

  await agente.post(`/api/ingredientes/${creado.body.id}/movimientos`).send({ delta: 30, motivo: 'compra' });

  const ingredientes = await agente.get('/api/ingredientes');
  const ingrediente = ingredientes.body.find((i) => i.id === creado.body.id);
  assert.equal(ingrediente.actualizadoPor, undefined);
});
