const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { crearAppDePrueba } = require('../ayudas/appDePrueba');
const { crearUsuarioDePrueba } = require('../ayudas/usuariosDePrueba');

async function iniciarSesionMesero(app, contenedor) {
  crearUsuarioDePrueba(contenedor, { nombreCompleto: 'Beto', correo: 'beto@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });
  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ correo: 'beto@hotelandino.com', contrasena: 'clave123' });
  return agente;
}

test('mesero puede crear un huésped', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const agente = await iniciarSesionMesero(app, contenedor);

  const respuesta = await agente.post('/api/huespedes').send({ documento: '123456', nombreCompleto: 'Carlos Ruiz', tipoHuesped: 'ordinario' });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.documento, '123456');
  assert.equal(respuesta.body.tipoHuesped, 'ordinario');
});

test('un usuario no autorizado (cocina) recibe 403 al crear un huésped', async () => {
  const { app, contenedor } = crearAppDePrueba();
  crearUsuarioDePrueba(contenedor, { nombreCompleto: 'Chef', correo: 'chef@hotelandino.com', contrasena: 'clave123', rol: 'cocina' });
  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ correo: 'chef@hotelandino.com', contrasena: 'clave123' });

  const respuesta = await agente.post('/api/huespedes').send({ documento: '999999', nombreCompleto: 'Ana Pérez', tipoHuesped: 'vip' });

  assert.equal(respuesta.status, 403);
});

test('crear un huésped con documento duplicado responde 409', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const agente = await iniciarSesionMesero(app, contenedor);
  await agente.post('/api/huespedes').send({ documento: '123456', nombreCompleto: 'Carlos Ruiz', tipoHuesped: 'ordinario' });

  const respuesta = await agente.post('/api/huespedes').send({ documento: '123456', nombreCompleto: 'Otro Nombre', tipoHuesped: 'vip' });

  assert.equal(respuesta.status, 409);
  assert.equal(respuesta.body.error.codigo, 'HUESPED_DUPLICADO');
});

test('crear un huésped con datos inválidos responde 422', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const agente = await iniciarSesionMesero(app, contenedor);

  const respuesta = await agente.post('/api/huespedes').send({ documento: '123456', nombreCompleto: 'Carlos Ruiz', tipoHuesped: 'inventado' });

  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.body.error.codigo, 'DATOS_INVALIDOS');
});

test('GET /api/huespedes encuentra al huésped por documento', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const agente = await iniciarSesionMesero(app, contenedor);
  await agente.post('/api/huespedes').send({ documento: '123456', nombreCompleto: 'Carlos Ruiz', tipoHuesped: 'ordinario' });

  const respuesta = await agente.get('/api/huespedes?documento=123456');

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.nombreCompleto, 'Carlos Ruiz');
});

test('GET /api/huespedes con documento inexistente responde 404', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const agente = await iniciarSesionMesero(app, contenedor);

  const respuesta = await agente.get('/api/huespedes?documento=000000');

  assert.equal(respuesta.status, 404);
  assert.equal(respuesta.body.error.codigo, 'HUESPED_NO_ENCONTRADO');
});

test('crear un huésped asigna creadoPor al mesero que lo crea', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const agente = await iniciarSesionMesero(app, contenedor);
  const yo = await agente.get('/api/auth/yo');

  const respuesta = await agente.post('/api/huespedes').send({ documento: '123456', nombreCompleto: 'Carlos Ruiz', tipoHuesped: 'ordinario' });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.creadoPor, yo.body.id);
});
