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

async function crearCategoria(agente, nombre) {
  const respuesta = await agente.post('/api/categorias').send({ nombre });
  return respuesta.body;
}

test('admin puede crear un plato con categoría válida', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const categoria = await crearCategoria(agente, 'Entradas');

  const respuesta = await agente.post('/api/platos').send({ categoriaId: categoria.id, nombre: 'Empanadas', precio: 8000, informacion: 'Con ají' });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.nombre, 'Empanadas');
  assert.equal(respuesta.body.disponible, true);
});

test('crear un plato con categoriaId inexistente responde 404', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.post('/api/platos').send({ categoriaId: 9999, nombre: 'Empanadas', precio: 8000 });

  assert.equal(respuesta.status, 404);
  assert.equal(respuesta.body.error.codigo, 'CATEGORIA_NO_ENCONTRADA');
});

test('un usuario no-admin recibe 403 al intentar crear un plato', async () => {
  const { app, contenedor } = crearAppDePrueba();
  crearUsuarioDePrueba(contenedor, { nombreCompleto: 'Beto', correo: 'beto@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });
  const adminAgente = await iniciarSesionAdmin(app);
  const categoria = await crearCategoria(adminAgente, 'Entradas');

  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ correo: 'beto@hotelandino.com', contrasena: 'clave123' });
  const respuesta = await agente.post('/api/platos').send({ categoriaId: categoria.id, nombre: 'Empanadas', precio: 8000 });

  assert.equal(respuesta.status, 403);
});

test('crear un plato con precio negativo responde 422', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const categoria = await crearCategoria(agente, 'Entradas');

  const respuesta = await agente.post('/api/platos').send({ categoriaId: categoria.id, nombre: 'Empanadas', precio: -100 });

  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.body.error.codigo, 'DATOS_INVALIDOS');
});

test('GET /api/platos lista todos los platos', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const categoria = await crearCategoria(agente, 'Entradas');
  await agente.post('/api/platos').send({ categoriaId: categoria.id, nombre: 'Empanadas', precio: 8000 });

  const respuesta = await agente.get('/api/platos');

  assert.equal(respuesta.status, 200);
  assert.ok(Array.isArray(respuesta.body));
  assert.ok(respuesta.body.some((p) => p.nombre === 'Empanadas'));
});

test('GET /api/platos filtra por categoriaId', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const entradas = await crearCategoria(agente, 'Entradas');
  const postres = await crearCategoria(agente, 'Postres');
  await agente.post('/api/platos').send({ categoriaId: entradas.id, nombre: 'Empanadas', precio: 8000 });
  await agente.post('/api/platos').send({ categoriaId: postres.id, nombre: 'Flan', precio: 6000 });

  const respuesta = await agente.get(`/api/platos?categoriaId=${postres.id}`);

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.length, 1);
  assert.equal(respuesta.body[0].nombre, 'Flan');
});

test('GET /api/platos filtra por disponible=false', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const categoria = await crearCategoria(agente, 'Entradas');
  const creado = await agente.post('/api/platos').send({ categoriaId: categoria.id, nombre: 'Empanadas', precio: 8000 });
  await agente.patch(`/api/platos/${creado.body.id}/disponibilidad`).send({ disponible: false });
  await agente.post('/api/platos').send({ categoriaId: categoria.id, nombre: 'Ajiaco', precio: 15000 });

  const respuesta = await agente.get('/api/platos?disponible=false');

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.length, 1);
  assert.equal(respuesta.body[0].nombre, 'Empanadas');
});

test('admin edita un plato', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const categoria = await crearCategoria(agente, 'Entradas');
  const creado = await agente.post('/api/platos').send({ categoriaId: categoria.id, nombre: 'Empanadas', precio: 8000 });

  const respuesta = await agente.put(`/api/platos/${creado.body.id}`).send({ categoriaId: categoria.id, nombre: 'Empanadas grandes', precio: 9000 });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.nombre, 'Empanadas grandes');
  assert.equal(respuesta.body.precio, 9000);
});

test('PATCH /api/platos/:id/disponibilidad desactiva un plato', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const categoria = await crearCategoria(agente, 'Entradas');
  const creado = await agente.post('/api/platos').send({ categoriaId: categoria.id, nombre: 'Empanadas', precio: 8000 });

  const respuesta = await agente.patch(`/api/platos/${creado.body.id}/disponibilidad`).send({ disponible: false });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.disponible, false);
});
