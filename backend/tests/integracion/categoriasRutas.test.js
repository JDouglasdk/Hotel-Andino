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

test('admin puede crear una categoría', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.post('/api/categorias').send({ nombre: 'Entradas' });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.nombre, 'Entradas');
});

test('un usuario no-admin recibe 403 al intentar crear una categoría', async () => {
  const { app, contenedor } = crearAppDePrueba();
  crearUsuarioDePrueba(contenedor, { nombreCompleto: 'Beto', correo: 'beto@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });
  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ correo: 'beto@hotelandino.com', contrasena: 'clave123' });

  const respuesta = await agente.post('/api/categorias').send({ nombre: 'Postres' });

  assert.equal(respuesta.status, 403);
});

test('crear una categoría con nombre duplicado responde 409', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  await agente.post('/api/categorias').send({ nombre: 'Entradas' });

  const respuesta = await agente.post('/api/categorias').send({ nombre: 'Entradas' });

  assert.equal(respuesta.status, 409);
  assert.equal(respuesta.body.error.codigo, 'CATEGORIA_DUPLICADA');
});

test('crear una categoría con nombre duplicado por mayúsculas o espacios responde 409', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  await agente.post('/api/categorias').send({ nombre: 'Entradas' });

  const porMayusculas = await agente.post('/api/categorias').send({ nombre: 'entradas' });
  const porEspacios = await agente.post('/api/categorias').send({ nombre: '  Entradas  ' });

  assert.equal(porMayusculas.status, 409);
  assert.equal(porMayusculas.body.error.codigo, 'CATEGORIA_DUPLICADA');
  assert.equal(porEspacios.status, 409);
  assert.equal(porEspacios.body.error.codigo, 'CATEGORIA_DUPLICADA');
});

test('crear una categoría con nombre vacío responde 422', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.post('/api/categorias').send({ nombre: '' });

  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.body.error.codigo, 'DATOS_INVALIDOS');
});

test('GET /api/categorias lista las categorías', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  await agente.post('/api/categorias').send({ nombre: 'Entradas' });

  const respuesta = await agente.get('/api/categorias');

  assert.equal(respuesta.status, 200);
  assert.ok(Array.isArray(respuesta.body));
  assert.ok(respuesta.body.some((c) => c.nombre === 'Entradas'));
});

test('admin renombra una categoría', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const creada = await agente.post('/api/categorias').send({ nombre: 'Entradas' });

  const respuesta = await agente.put(`/api/categorias/${creada.body.id}`).send({ nombre: 'Entradas frías' });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.nombre, 'Entradas frías');
});

test('renombrar una categoría inexistente responde 404', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.put('/api/categorias/9999').send({ nombre: 'Lo que sea' });

  assert.equal(respuesta.status, 404);
});
