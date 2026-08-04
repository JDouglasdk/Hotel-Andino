const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { crearAppDePrueba } = require('../ayudas/appDePrueba');
const { crearUsuarioDePrueba } = require('../ayudas/usuariosDePrueba');

test('POST /api/auth/login acepta credenciales correctas y fija cookie de sesión', async () => {
  const { app } = crearAppDePrueba();

  const respuesta = await request(app).post('/api/auth/login').send({ correo: 'admin@hotelandino.com', contrasena: 'Admin123!' });

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.rol, 'admin');
  assert.equal(respuesta.body.contrasenaHash, undefined);
  assert.match(respuesta.headers['set-cookie']?.[0] ?? '', /sesionHotel=/);
});

test('POST /api/auth/login rechaza credenciales incorrectas con 401', async () => {
  const { app } = crearAppDePrueba();

  const respuesta = await request(app).post('/api/auth/login').send({ correo: 'admin@hotelandino.com', contrasena: 'incorrecta' });

  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.body.error.codigo, 'CREDENCIALES_INVALIDAS');
});

test('GET /api/auth/yo devuelve 401 sin cookie de sesión', async () => {
  const { app } = crearAppDePrueba();

  const respuesta = await request(app).get('/api/auth/yo');

  assert.equal(respuesta.status, 401);
});

test('GET /api/auth/yo devuelve los datos del usuario autenticado', async () => {
  const { app } = crearAppDePrueba();
  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ correo: 'admin@hotelandino.com', contrasena: 'Admin123!' });

  const respuesta = await agente.get('/api/auth/yo');

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.rol, 'admin');
});

test('POST /api/auth/logout destruye la sesión', async () => {
  const { app } = crearAppDePrueba();
  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ correo: 'admin@hotelandino.com', contrasena: 'Admin123!' });

  await agente.post('/api/auth/logout').expect(200);
  const respuesta = await agente.get('/api/auth/yo');

  assert.equal(respuesta.status, 401);
});

test('el 6to intento de login en la ventana de 15 minutos responde 429', async () => {
  const { app } = crearAppDePrueba();

  for (let intento = 0; intento < 5; intento += 1) {
    await request(app).post('/api/auth/login').send({ correo: 'admin@hotelandino.com', contrasena: 'incorrecta' });
  }
  const sextoIntento = await request(app).post('/api/auth/login').send({ correo: 'admin@hotelandino.com', contrasena: 'incorrecta' });

  assert.equal(sextoIntento.status, 429);
  assert.equal(sextoIntento.body.error.codigo, 'DEMASIADOS_INTENTOS');
});

test('un usuario desactivado con sesión activa recibe 401 en la siguiente request', async () => {
  const { app, contenedor } = crearAppDePrueba();
  const mesero = crearUsuarioDePrueba(contenedor, { nombreCompleto: 'Beto', correo: 'beto@hotelandino.com', contrasena: 'clave123', rol: 'mesero' });
  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ correo: 'beto@hotelandino.com', contrasena: 'clave123' });

  contenedor.servicios.usuariosServicio.cambiarEstadoUsuario({ id: mesero.id, activo: false });
  const respuesta = await agente.get('/api/auth/yo');

  assert.equal(respuesta.status, 401);
});

test('POST /api/auth/login con un correo sin formato válido responde 422', async () => {
  const { app } = crearAppDePrueba();

  const respuesta = await request(app).post('/api/auth/login').send({ correo: 'no-es-un-correo', contrasena: 'algo' });

  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.body.error.codigo, 'DATOS_INVALIDOS');
});

test('POST /api/auth/login con correo de más de 254 caracteres responde 422 DATOS_INVALIDOS', async () => {
  const { app } = crearAppDePrueba();
  const correoLargo = `${'a'.repeat(250)}@x.com`; // 256 caracteres, verificado con node -e

  const respuesta = await request(app).post('/api/auth/login').send({ correo: correoLargo, contrasena: 'cualquiera' });

  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.body.error.codigo, 'DATOS_INVALIDOS');
});

test('POST /api/auth/login con una contraseña muy larga (100 chars) llega a verificarCredenciales y responde 401, no 422 — no debe rechazarse en el esquema', async () => {
  const { app } = crearAppDePrueba();
  const contrasenaLarga = 'x'.repeat(100);

  const respuesta = await request(app).post('/api/auth/login').send({ correo: 'admin@hotelandino.com', contrasena: contrasenaLarga });

  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.body.error.codigo, 'CREDENCIALES_INVALIDAS');
});
