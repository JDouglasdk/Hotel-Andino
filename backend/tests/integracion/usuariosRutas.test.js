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

test('admin puede crear un usuario', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.post('/api/usuarios').send({ nombreCompleto: 'Ana', correo: 'ana@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.correo, 'ana@hotelandino.com');
  assert.equal(respuesta.body.contrasenaHash, undefined);
});

test('un usuario no-admin recibe 403 al intentar crear un usuario', async () => {
  const { app, contenedor } = crearAppDePrueba();
  crearUsuarioDePrueba(contenedor, { nombreCompleto: 'Beto', correo: 'beto@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });
  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ correo: 'beto@hotelandino.com', contrasena: 'clave123' });

  const respuesta = await agente.post('/api/usuarios').send({ nombreCompleto: 'Otro', correo: 'otro@hotelandino.com', contrasena: 'clave123', rol: 'cocina' });

  assert.equal(respuesta.status, 403);
});

test('crear un usuario con rol inválido responde 422', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.post('/api/usuarios').send({ nombreCompleto: 'Ana', correo: 'ana@hotelandino.com', contrasena: 'clave123', rol: 'gerente' });

  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.body.error.codigo, 'ROL_INVALIDO');
});

test('GET /api/usuarios lista usuarios sin contrasenaHash', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.get('/api/usuarios');

  assert.equal(respuesta.status, 200);
  assert.ok(Array.isArray(respuesta.body));
  assert.ok(respuesta.body.every((u) => u.contrasenaHash === undefined));
});

test('PATCH /api/usuarios/:id/estado desactiva un usuario', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const mesero = crearUsuarioDePrueba(contenedor, { nombreCompleto: 'Beto', correo: 'beto@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.patch(`/api/usuarios/${mesero.id}/estado`).send({ activo: false });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.activo, false);
});

test('crear un usuario sin contrasena responde 422 con DATOS_INVALIDOS', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);

  const respuesta = await agente.post('/api/usuarios').send({ nombreCompleto: 'Ana', correo: 'ana@hotelandino.com', rol: 'mesero' });

  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.body.error.codigo, 'DATOS_INVALIDOS');
});

test('crear un usuario asigna creadoPor al actor que lo crea', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const yo = await agente.get('/api/auth/yo');

  const respuesta = await agente.post('/api/usuarios').send({ nombreCompleto: 'Ana', correo: 'ana@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.creadoPor, yo.body.id);
  assert.equal(respuesta.body.actualizadoPor, null);
});

test('editar un usuario asigna actualizadoPor y actualizadoEn', async () => {
  const { app } = crearAppDePrueba();
  const agente = await iniciarSesionAdmin(app);
  const yo = await agente.get('/api/auth/yo');
  const creado = await agente.post('/api/usuarios').send({ nombreCompleto: 'Ana', correo: 'ana@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });

  const respuesta = await agente.put(`/api/usuarios/${creado.body.id}`).send({ nombreCompleto: 'Ana Actualizada', correo: 'ana@hotelandino.com', rol: 'mesero' });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.actualizadoPor, yo.body.id);
  assert.ok(respuesta.body.actualizadoEn);
});

test('desactivar un usuario asigna actualizadoPor y actualizadoEn', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const mesero = crearUsuarioDePrueba(contenedor, { nombreCompleto: 'Beto', correo: 'beto@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });
  const agente = await iniciarSesionAdmin(app);
  const yo = await agente.get('/api/auth/yo');

  const respuesta = await agente.patch(`/api/usuarios/${mesero.id}/estado`).send({ activo: false });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.actualizadoPor, yo.body.id);
  assert.ok(respuesta.body.actualizadoEn);
});
