const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const request = require('supertest');

const { crearConexion } = require('../../src/db/conexion');
const { aplicarMigraciones } = require('../../src/db/migraciones/migrar');
const { crearHuespedesRepositorio } = require('../../src/modelos/huespedesRepositorio');
const { crearHuespedesServicio } = require('../../src/servicios/huespedesServicio');
const { crearHuespedesControlador } = require('../../src/controladores/huespedesControlador');
const { crearRutasHuespedes } = require('../../src/rutas/huespedes');
const { crearRequiereSesion, crearRequiereRol } = require('../../src/middlewares/autenticacion');
const { manejadorErrores } = require('../../src/middlewares/manejadorErrores');

// El módulo real de usuarios (login) todavía no existe en este repo — ver
// aviso en la respuesta. Para probar `requiereSesion`/`requiereRol` en
// aislamiento usamos un usuariosServicio de prueba con usuarios fijos y una
// ruta de solo-test que simula el login (setea req.session.usuarioId), en
// vez de depender del flujo real de autenticación que no está construido.
const USUARIOS_DE_PRUEBA = {
  1: { id: 1, rol: 'admin', activo: 1 },
  2: { id: 2, rol: 'mesero', activo: 1 },
  3: { id: 3, rol: 'cocina', activo: 1 },
  4: { id: 4, rol: 'mesero', activo: 0 }, // inactivo
};

function crearAppDePrueba() {
  const conexion = crearConexion(':memory:');
  aplicarMigraciones(conexion);

  const usuariosServicioFalso = {
    obtenerUsuarioPorId(id) {
      return USUARIOS_DE_PRUEBA[id];
    },
  };

  const huespedesRepositorio = crearHuespedesRepositorio(conexion);
  const huespedesServicio = crearHuespedesServicio({ huespedesRepositorio });
  const huespedesControlador = crearHuespedesControlador({ huespedesServicio });

  const requiereSesion = crearRequiereSesion({ usuariosServicio: usuariosServicioFalso });
  const requiereRol = crearRequiereRol;

  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'secreto-de-test', resave: false, saveUninitialized: false }));

  // Ruta de solo-test para simular el login sin depender del módulo real.
  app.post('/test/iniciar-sesion', (req, res) => {
    req.session.usuarioId = req.body.usuarioId;
    res.status(204).end();
  });

  app.use(
    '/api/huespedes',
    crearRutasHuespedes({ controlador: huespedesControlador, requiereSesion, requiereRol })
  );

  app.use(manejadorErrores);

  return app;
}

async function iniciarSesionComo(agente, usuarioId) {
  await agente.post('/test/iniciar-sesion').send({ usuarioId }).expect(204);
}

test('POST /api/huespedes sin sesión devuelve 401', async () => {
  const app = crearAppDePrueba();

  const respuesta = await request(app)
    .post('/api/huespedes')
    .send({ documento: '1', nombreCompleto: 'Sin Sesión', tipoHuesped: 'ordinario' });

  assert.equal(respuesta.status, 401);
});

test('POST /api/huespedes como cocina devuelve 403', async () => {
  const app = crearAppDePrueba();
  const agente = request.agent(app);
  await iniciarSesionComo(agente, 3);

  const respuesta = await agente
    .post('/api/huespedes')
    .send({ documento: '10', nombreCompleto: 'Alguien', tipoHuesped: 'ordinario' });

  assert.equal(respuesta.status, 403);
});

test('POST /api/huespedes como mesero crea el huésped', async () => {
  const app = crearAppDePrueba();
  const agente = request.agent(app);
  await iniciarSesionComo(agente, 2);

  const respuesta = await agente
    .post('/api/huespedes')
    .send({ documento: '100', nombreCompleto: 'Huésped Nuevo', tipoHuesped: 'vip' });

  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.huesped.documento, '100');
  assert.equal(respuesta.body.huesped.tipo_huesped, 'vip');
});

test('POST /api/huespedes con usuario inactivo devuelve 401', async () => {
  const app = crearAppDePrueba();
  const agente = request.agent(app);
  await iniciarSesionComo(agente, 4);

  const respuesta = await agente
    .post('/api/huespedes')
    .send({ documento: '101', nombreCompleto: 'Otro', tipoHuesped: 'ordinario' });

  assert.equal(respuesta.status, 401);
});

test('POST /api/huespedes con datos inválidos devuelve 400', async () => {
  const app = crearAppDePrueba();
  const agente = request.agent(app);
  await iniciarSesionComo(agente, 1);

  const respuesta = await agente
    .post('/api/huespedes')
    .send({ documento: '102', nombreCompleto: 'X', tipoHuesped: 'premium' });

  assert.equal(respuesta.status, 400);
  assert.equal(respuesta.body.error.codigo, 'VALIDACION');
});

test('POST /api/huespedes con documento duplicado devuelve 409', async () => {
  const app = crearAppDePrueba();
  const agente = request.agent(app);
  await iniciarSesionComo(agente, 1);

  await agente
    .post('/api/huespedes')
    .send({ documento: '200', nombreCompleto: 'Primera Vez', tipoHuesped: 'ordinario' })
    .expect(201);

  const respuesta = await agente
    .post('/api/huespedes')
    .send({ documento: '200', nombreCompleto: 'Segunda Vez', tipoHuesped: 'ejecutivo' });

  assert.equal(respuesta.status, 409);
  assert.equal(respuesta.body.error.codigo, 'DOCUMENTO_DUPLICADO');
});

test('GET /api/huespedes/:documento devuelve el huésped a cualquier rol autenticado', async () => {
  const app = crearAppDePrueba();
  const agenteMesero = request.agent(app);
  await iniciarSesionComo(agenteMesero, 2);
  await agenteMesero
    .post('/api/huespedes')
    .send({ documento: '300', nombreCompleto: 'Consultable', tipoHuesped: 'ejecutivo' })
    .expect(201);

  const agenteCocina = request.agent(app);
  await iniciarSesionComo(agenteCocina, 3);

  const respuesta = await agenteCocina.get('/api/huespedes/300');

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.huesped.nombre_completo, 'Consultable');
});

test('GET /api/huespedes/:documento inexistente devuelve 404', async () => {
  const app = crearAppDePrueba();
  const agente = request.agent(app);
  await iniciarSesionComo(agente, 3);

  const respuesta = await agente.get('/api/huespedes/no-existe');

  assert.equal(respuesta.status, 404);
});

test('GET /api/huespedes lista huéspedes existentes', async () => {
  const app = crearAppDePrueba();
  const agente = request.agent(app);
  await iniciarSesionComo(agente, 1);
  await agente
    .post('/api/huespedes')
    .send({ documento: '400', nombreCompleto: 'Uno', tipoHuesped: 'ordinario' })
    .expect(201);

  const respuesta = await agente.get('/api/huespedes');

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.huespedes.length, 1);
});
