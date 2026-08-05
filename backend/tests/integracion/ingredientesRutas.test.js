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

test('admin actualiza el stock de un ingrediente', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const creado = await agente.post('/api/ingredientes').send({ nombre: 'Papa', cantidadStock: 50, unidadMedida: 'kg' });

  const respuesta = await agente.patch(`/api/ingredientes/${creado.body.id}/stock`).send({ cantidadStock: 80 });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.cantidadStock, 80);
});

test('actualizar stock de un ingrediente inexistente responde 404', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.patch('/api/ingredientes/9999/stock').send({ cantidadStock: 10 });

  assert.equal(respuesta.status, 404);
  assert.equal(respuesta.body.error.codigo, 'INGREDIENTE_NO_ENCONTRADO');
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
