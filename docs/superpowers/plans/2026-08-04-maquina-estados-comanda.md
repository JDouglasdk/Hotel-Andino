# Máquina de estados de comanda + prerequisito de huéspedes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el módulo mínimo de huéspedes (prerequisito) y la máquina de estados de comanda (pedidos) — API REST + tests de integración — dejando un contrato de inyección de dependencias claro para los dos puntos de enganche que construye el compañero de equipo (derecho de comidas, descuento de inventario).

**Architecture:** Dos sub-módulos secuenciales (huéspedes primero, pedidos depende de él), mismo patrón de capas `rutas → controladores → servicios → modelos` que auth/usuarios/menú. `pedidosServicio` depende de `huespedesRepositorio` y `platosRepositorio` (verificación de existencia) más dos colaboradores inyectados (`derechoDeComidasServicio`, `inventarioServicio`) cuya implementación real construye el compañero — se registra un placeholder temporal en el contenedor para que la app arranque y los tests corran hoy.

**Tech Stack:** Node.js + Express, better-sqlite3 (incluye `conexion.transaction()` para insertar pedido+items atómicamente), zod, `node --test` + supertest.

## Global Constraints

- Seguir el patrón de capas ya usado en `usuarios`/`categorias`/`platos` (`rutas → controladores → servicios → modelos`) — mismo estilo de nombres, mismo patrón de `aDominio`/`obtenerPorId` en repositorios.
- Queries SQL siempre parametrizadas (`conexion.prepare(...).run(valores)`), nunca concatenar SQL con datos de entrada.
- Validación de entrada con zod, esquemas `.strict()`.
- Controladores sin lógica de negocio — solo leen `req`, llaman al servicio, mapean a status HTTP.
- Errores de negocio vía `ErrorDeNegocio`/`ErrorNoEncontrado` (`backend/src/utilidades/errores.js`).
- **Contrato exacto de los puntos de enganche** (no renegociable sin volver al spec):
  - `derechoDeComidasServicio.validarDerecho({ huespedId, franja })` — no retorna nada si es válido; lanza `ErrorDeNegocio` si no.
  - `inventarioServicio.descontarPorPedido({ items })` donde `items = [{ platoId, cantidad }]` — no retorna nada si hay stock; lanza `ErrorDeNegocio` si no.
  - `pedidosServicio` los llama tal cual, sin envolver ni reinterpretar sus errores.
- Sin cambios de frontend en este plan.
- Los commits de este repo **no** llevan línea `Co-Authored-By: Claude ...` — omitirla en todos los `git commit` de este plan.
- Spec de referencia: `docs/superpowers/specs/2026-08-04-maquina-estados-comanda-design.md`.

---

### Task 1: Módulo de huéspedes (prerequisito mínimo)

**Files:**
- Create: `backend/src/esquemas/huespedesEsquemas.js`
- Create: `backend/src/modelos/huespedesRepositorio.js`
- Create: `backend/src/servicios/huespedesServicio.js`
- Create: `backend/src/controladores/huespedesControlador.js`
- Create: `backend/src/rutas/huespedes.js`
- Modify: `backend/src/contenedor.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/integracion/huespedesRutas.test.js`

**Interfaces:**
- Produces: `crearHuespedesRepositorio(conexion)` → `{ crear({documento,nombreCompleto,telefono,tipoHuesped}), buscarPorId(id), buscarPorDocumento(documento) }`, objetos de dominio `{ id, documento, nombreCompleto, telefono, tipoHuesped, creadoEn }`.
- Produces: en `contenedor.js`, `contenedor.repositorios.huespedesRepositorio` — Task 2 lo consume directamente (no el servicio) para verificar existencia, igual que `platosServicio → categoriasRepositorio`.

- [ ] **Step 1: Escribir el archivo de tests de integración (fallará — nada existe todavía)**

Crear `backend/tests/integracion/huespedesRutas.test.js`:

```js
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
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd backend && npm test -- --test-name-pattern="huésped"`
Expected: FAIL — `/api/huespedes` no existe todavía (404 de la ruta catch-all).

- [ ] **Step 3: Crear el esquema de validación**

Crear `backend/src/esquemas/huespedesEsquemas.js`:

```js
const { z } = require('zod');
const { nombrePersona, telefono } = require('./comunEsquemas');

const esquemaCrearHuesped = z.object({
  documento: z.string().trim().min(1).max(30),
  nombreCompleto: nombrePersona,
  telefono: telefono.optional(),
  tipoHuesped: z.enum(['ordinario', 'ejecutivo', 'vip']),
}).strict();

const esquemaBuscarHuespedPorDocumento = z.object({
  documento: z.string().trim().min(1).max(30),
}).strict();

module.exports = { esquemaCrearHuesped, esquemaBuscarHuespedPorDocumento };
```

- [ ] **Step 4: Crear el repositorio**

Crear `backend/src/modelos/huespedesRepositorio.js`:

```js
function crearHuespedesRepositorio(conexion) {
  const insertar = conexion.prepare(`
    INSERT INTO huespedes (documento, nombre_completo, telefono, tipo_huesped, creado_en)
    VALUES (@documento, @nombreCompleto, @telefono, @tipoHuesped, @creadoEn)
  `);
  const buscarPorIdStmt = conexion.prepare('SELECT * FROM huespedes WHERE id = ?');
  const buscarPorDocumentoStmt = conexion.prepare('SELECT * FROM huespedes WHERE documento = ?');

  function aDominio(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      documento: fila.documento,
      nombreCompleto: fila.nombre_completo,
      telefono: fila.telefono,
      tipoHuesped: fila.tipo_huesped,
      creadoEn: fila.creado_en,
    };
  }

  function obtenerPorId(id) {
    return aDominio(buscarPorIdStmt.get(id));
  }

  return {
    crear({ documento, nombreCompleto, telefono, tipoHuesped }) {
      const creadoEn = new Date().toISOString();
      const resultado = insertar.run({ documento, nombreCompleto, telefono: telefono ?? null, tipoHuesped, creadoEn });
      return obtenerPorId(resultado.lastInsertRowid);
    },
    buscarPorId(id) {
      return obtenerPorId(id);
    },
    buscarPorDocumento(documento) {
      return aDominio(buscarPorDocumentoStmt.get(documento));
    },
  };
}

module.exports = { crearHuespedesRepositorio };
```

- [ ] **Step 5: Crear el servicio**

Crear `backend/src/servicios/huespedesServicio.js`:

```js
const { ErrorDeNegocio } = require('../utilidades/errores');

function crearHuespedesServicio({ huespedesRepositorio }) {
  return {
    crearHuesped({ documento, nombreCompleto, telefono, tipoHuesped }) {
      if (huespedesRepositorio.buscarPorDocumento(documento)) {
        throw new ErrorDeNegocio(`Ya existe un huésped con el documento ${documento}`, { codigo: 'HUESPED_DUPLICADO', status: 409 });
      }
      return huespedesRepositorio.crear({ documento, nombreCompleto, telefono, tipoHuesped });
    },

    buscarHuespedPorDocumento(documento) {
      const huesped = huespedesRepositorio.buscarPorDocumento(documento);
      if (!huesped) {
        throw new ErrorDeNegocio(`No existe un huésped con el documento ${documento}`, { codigo: 'HUESPED_NO_ENCONTRADO', status: 404 });
      }
      return huesped;
    },
  };
}

module.exports = { crearHuespedesServicio };
```

- [ ] **Step 6: Crear el controlador**

Crear `backend/src/controladores/huespedesControlador.js`:

```js
function crearHuespedesControlador({ huespedesServicio }) {
  return {
    crear(req, res) {
      const huesped = huespedesServicio.crearHuesped({
        documento: req.body.documento,
        nombreCompleto: req.body.nombreCompleto,
        telefono: req.body.telefono,
        tipoHuesped: req.body.tipoHuesped,
      });
      res.status(201).json(huesped);
    },
    buscarPorDocumento(req, res) {
      const huesped = huespedesServicio.buscarHuespedPorDocumento(req.query.documento);
      res.json(huesped);
    },
  };
}

module.exports = { crearHuespedesControlador };
```

- [ ] **Step 7: Crear las rutas**

Crear `backend/src/rutas/huespedes.js`:

```js
const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');
const { validar } = require('../middlewares/validacion');
const { esquemaCrearHuesped, esquemaBuscarHuespedPorDocumento } = require('../esquemas/huespedesEsquemas');

function crearRutasHuespedes({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereMeseroOAdmin = crearRequiereRol('mesero', 'admin');

  router.get('/', requiereSesion, validar({ consulta: esquemaBuscarHuespedPorDocumento }), controlador.buscarPorDocumento);
  router.post('/', requiereSesion, requiereMeseroOAdmin, validar({ cuerpo: esquemaCrearHuesped }), controlador.crear);

  return router;
}

module.exports = { crearRutasHuespedes };
```

- [ ] **Step 8: Registrar huéspedes en el contenedor de inyección de dependencias**

Reemplazar el contenido completo de `backend/src/contenedor.js`:

```js
// Contenedor de inyección de dependencias. Patrón reciclado de
// restaurante-app: cada repositorio se construye a partir de la conexión a
// BD, cada servicio recibe los repositorios (y otros servicios) que necesita
// por parámetro — nunca hace `require` directo de un repositorio. Así la
// lógica de negocio en servicios/ no depende de cómo se conecta a SQLite.
//
// Los módulos que faltan (ingredientes, pedidos) se agregan aquí siguiendo
// el mismo patrón: repositorio primero, servicio después, registrar ambos
// abajo.

const { crearUsuariosRepositorio } = require('./modelos/usuariosRepositorio');
const { crearCategoriasRepositorio } = require('./modelos/categoriasRepositorio');
const { crearPlatosRepositorio } = require('./modelos/platosRepositorio');
const { crearHuespedesRepositorio } = require('./modelos/huespedesRepositorio');
const { crearAutenticacionServicio } = require('./servicios/autenticacionServicio');
const { crearUsuariosServicio } = require('./servicios/usuariosServicio');
const { crearCategoriasServicio } = require('./servicios/categoriasServicio');
const { crearPlatosServicio } = require('./servicios/platosServicio');
const { crearHuespedesServicio } = require('./servicios/huespedesServicio');

function crearContenedor(conexion) {
  const repositorios = {
    usuariosRepositorio: crearUsuariosRepositorio(conexion),
    categoriasRepositorio: crearCategoriasRepositorio(conexion),
    platosRepositorio: crearPlatosRepositorio(conexion),
    huespedesRepositorio: crearHuespedesRepositorio(conexion),
  };

  const autenticacionServicio = crearAutenticacionServicio({ usuariosRepositorio: repositorios.usuariosRepositorio });

  const servicios = {
    autenticacionServicio,
    usuariosServicio: crearUsuariosServicio({
      usuariosRepositorio: repositorios.usuariosRepositorio,
      autenticacionServicio,
    }),
    categoriasServicio: crearCategoriasServicio({
      categoriasRepositorio: repositorios.categoriasRepositorio,
    }),
    platosServicio: crearPlatosServicio({
      platosRepositorio: repositorios.platosRepositorio,
      categoriasRepositorio: repositorios.categoriasRepositorio,
    }),
    huespedesServicio: crearHuespedesServicio({
      huespedesRepositorio: repositorios.huespedesRepositorio,
    }),
  };

  return { repositorios, servicios };
}

module.exports = { crearContenedor };
```

- [ ] **Step 9: Montar las rutas de huéspedes en la app**

Reemplazar el contenido completo de `backend/src/app.js`:

```js
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const timeout = require('connect-timeout');
const { crearConfigSesion } = require('./config/sesion');
const { entorno } = require('./config/entorno');
const { crearRequiereSesion } = require('./middlewares/autenticacion');
const { crearLimitadorGeneral } = require('./middlewares/limitadorGeneral');
const { manejadorErrores } = require('./middlewares/manejadorErrores');
const { crearAutenticacionControlador } = require('./controladores/autenticacionControlador');
const { crearRutasAutenticacion } = require('./rutas/autenticacion');
const { crearUsuariosControlador } = require('./controladores/usuariosControlador');
const { crearRutasUsuarios } = require('./rutas/usuarios');
const { crearCategoriasControlador } = require('./controladores/categoriasControlador');
const { crearRutasCategorias } = require('./rutas/categorias');
const { crearPlatosControlador } = require('./controladores/platosControlador');
const { crearRutasPlatos } = require('./rutas/platos');
const { crearHuespedesControlador } = require('./controladores/huespedesControlador');
const { crearRutasHuespedes } = require('./rutas/huespedes');

function crearApp(contenedor, { rutaSesionesDb } = {}) {
  const app = express();
  app.set('trust proxy', entorno.confiarEnProxy);
  app.use(helmet());
  app.use(timeout('5s'));
  app.use(express.json());
  app.use(session(crearConfigSesion(rutaSesionesDb)));
  app.use('/api', crearLimitadorGeneral());

  const requiereSesion = crearRequiereSesion({ usuariosServicio: contenedor.servicios.usuariosServicio });

  const autenticacionControlador = crearAutenticacionControlador({
    autenticacionServicio: contenedor.servicios.autenticacionServicio,
    usuariosServicio: contenedor.servicios.usuariosServicio,
  });
  app.use('/api/auth', crearRutasAutenticacion({ controlador: autenticacionControlador, requiereSesion }));

  const usuariosControlador = crearUsuariosControlador({ usuariosServicio: contenedor.servicios.usuariosServicio });
  app.use('/api/usuarios', crearRutasUsuarios({ controlador: usuariosControlador, requiereSesion }));

  const categoriasControlador = crearCategoriasControlador({ categoriasServicio: contenedor.servicios.categoriasServicio });
  app.use('/api/categorias', crearRutasCategorias({ controlador: categoriasControlador, requiereSesion }));

  const platosControlador = crearPlatosControlador({ platosServicio: contenedor.servicios.platosServicio });
  app.use('/api/platos', crearRutasPlatos({ controlador: platosControlador, requiereSesion }));

  const huespedesControlador = crearHuespedesControlador({ huespedesServicio: contenedor.servicios.huespedesServicio });
  app.use('/api/huespedes', crearRutasHuespedes({ controlador: huespedesControlador, requiereSesion }));

  // ---------------------------------------------------------------------
  // Rutas de negocio que faltan (ver docs/decisiones.md — reparto entre
  // las dos personas del equipo):
  //
  //   app.use('/api/ingredientes', crearRutasIngredientes({ ... }));
  //   app.use('/api/pedidos', crearRutasPedidos({ ... }));
  //   app.use('/api/reportes', crearRutasReportes({ ... })); // incluye caja diaria
  // ---------------------------------------------------------------------

  const publicDir = path.join(__dirname, '../../frontend/public');
  app.use(express.static(publicDir));

  app.get('/login', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
  ['admin', 'mesero', 'cocina', 'jefeDeCaja'].forEach((rol) => {
    app.get(new RegExp(`^/${rol}(/.*)?$`), (req, res) => res.sendFile(path.join(publicDir, `${rol}.html`)));
  });
  app.get('/', (req, res) => res.redirect('/login'));

  app.use((req, res) => {
    res.status(404).json({ error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'Ruta no encontrada' } });
  });

  app.use(manejadorErrores);

  return app;
}

module.exports = { crearApp };
```

- [ ] **Step 10: Correr los tests y verificar que todos pasan**

Run: `cd backend && npm test`
Expected: PASS — 39 tests en total (33 previos + 6 nuevos de `huespedesRutas.test.js`).

- [ ] **Step 11: Commit**

```bash
git add backend/src/esquemas/huespedesEsquemas.js backend/src/modelos/huespedesRepositorio.js backend/src/servicios/huespedesServicio.js backend/src/controladores/huespedesControlador.js backend/src/rutas/huespedes.js backend/src/contenedor.js backend/src/app.js backend/tests/integracion/huespedesRutas.test.js
git commit -m "feat: modulo minimo de huespedes (prerequisito de pedidos)" -m "Crear + buscar por documento, unico rol de escritura mesero/admin.
Prerequisito no asignado en el reparto original: pedidos.huesped_id
lo necesita. 6 tests de integracion en verde."
```

---

### Task 2: Módulo de pedidos (máquina de estados)

**Files:**
- Create: `backend/src/esquemas/pedidosEsquemas.js`
- Create: `backend/src/modelos/pedidosRepositorio.js`
- Create: `backend/src/servicios/pedidosServicio.js`
- Create: `backend/src/controladores/pedidosControlador.js`
- Create: `backend/src/rutas/pedidos.js`
- Modify: `backend/src/contenedor.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/integracion/pedidosRutas.test.js`

**Interfaces:**
- Consumes: `huespedesRepositorio.buscarPorId(id)` → `{id, documento, nombreCompleto, telefono, tipoHuesped, creadoEn} | null` (de Task 1).
- Consumes: `platosRepositorio.buscarPorId(id)` → `{id, categoriaId, nombre, precio, informacion, disponible, creadoEn} | null` (del módulo de menú, ya en `main`).
- Consumes: `req.usuario = { id, rol }` puesto por `requiereSesion` (`backend/src/middlewares/autenticacion.js`).
- Produces: `crearPedidosRepositorio(conexion)` → `{ crear({huespedId,usuarioId,franja,items}), cambiarEstado({id,estado}), buscarPorId(id), listar({estado,franja}) }`, objetos de dominio `{ id, huespedId, usuarioId, franja, estado, creadoEn, items: [{id, platoId, cantidad, precioUnitario}] }`.
- Produces: `derechoDeComidasServicio`/`inventarioServicio` — contrato fijado en Global Constraints, con placeholder registrado en `contenedor.js` para que el compañero lo reemplace más adelante sin tocar `pedidosServicio`.

**Nota de better-sqlite3**: `crear` debe insertar el pedido y sus items en una sola transacción (`conexion.transaction(fn)`) — si falla a mitad de camino, no debe quedar un pedido sin items o a medio insertar. Ver Step 4.

- [ ] **Step 1: Escribir el archivo de tests de integración (fallará — nada existe todavía)**

Crear `backend/tests/integracion/pedidosRutas.test.js`:

```js
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
  const huesped = await adminAgente.post('/api/huespedes').send({ documento: '111111', nombreCompleto: 'Carlos Ruiz', tipoHuesped: 'ordinario' });
  const categoria = await adminAgente.post('/api/categorias').send({ nombre: 'Entradas' });
  const plato = await adminAgente.post('/api/platos').send({ categoriaId: categoria.body.id, nombre: 'Empanadas', precio: 8000 });
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
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd backend && npm test -- --test-name-pattern="pedido"`
Expected: FAIL — `/api/pedidos` no existe todavía.

- [ ] **Step 3: Crear el esquema de validación**

Crear `backend/src/esquemas/pedidosEsquemas.js`:

```js
const { z } = require('zod');

const esquemaItemPedido = z.object({
  platoId: z.coerce.number().int().positive(),
  cantidad: z.number().int().positive(),
}).strict();

const esquemaCrearPedido = z.object({
  huespedId: z.coerce.number().int().positive(),
  franja: z.enum(['desayuno', 'almuerzo', 'cena']),
  items: z.array(esquemaItemPedido).min(1),
}).strict();

const esquemaCambiarEstadoPedido = z.object({
  estado: z.enum(['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado']),
}).strict();

const esquemaFiltrarPedidos = z.object({
  estado: z.enum(['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado']).optional(),
  franja: z.enum(['desayuno', 'almuerzo', 'cena']).optional(),
}).strict();

module.exports = { esquemaCrearPedido, esquemaCambiarEstadoPedido, esquemaFiltrarPedidos };
```

- [ ] **Step 4: Crear el repositorio**

Crear `backend/src/modelos/pedidosRepositorio.js`:

```js
function crearPedidosRepositorio(conexion) {
  const insertarPedido = conexion.prepare(`
    INSERT INTO pedidos (huesped_id, usuario_id, franja, estado, creado_en)
    VALUES (@huespedId, @usuarioId, @franja, 'pendiente', @creadoEn)
  `);
  const insertarItem = conexion.prepare(`
    INSERT INTO items_pedido (pedido_id, plato_id, cantidad, precio_unitario)
    VALUES (@pedidoId, @platoId, @cantidad, @precioUnitario)
  `);
  const cambiarEstadoStmt = conexion.prepare('UPDATE pedidos SET estado = @estado WHERE id = @id');
  const buscarPedidoPorIdStmt = conexion.prepare('SELECT * FROM pedidos WHERE id = ?');
  const buscarItemsPorPedidoStmt = conexion.prepare('SELECT * FROM items_pedido WHERE pedido_id = ?');

  function itemADominio(fila) {
    return {
      id: fila.id,
      platoId: fila.plato_id,
      cantidad: fila.cantidad,
      precioUnitario: fila.precio_unitario,
    };
  }

  function pedidoADominio(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      huespedId: fila.huesped_id,
      usuarioId: fila.usuario_id,
      franja: fila.franja,
      estado: fila.estado,
      creadoEn: fila.creado_en,
      items: buscarItemsPorPedidoStmt.all(fila.id).map(itemADominio),
    };
  }

  function obtenerPorId(id) {
    return pedidoADominio(buscarPedidoPorIdStmt.get(id));
  }

  const crearConItems = conexion.transaction(({ huespedId, usuarioId, franja, items }) => {
    const creadoEn = new Date().toISOString();
    const resultado = insertarPedido.run({ huespedId, usuarioId, franja, creadoEn });
    const pedidoId = resultado.lastInsertRowid;
    for (const item of items) {
      insertarItem.run({ pedidoId, platoId: item.platoId, cantidad: item.cantidad, precioUnitario: item.precioUnitario });
    }
    return pedidoId;
  });

  return {
    crear({ huespedId, usuarioId, franja, items }) {
      const pedidoId = crearConItems({ huespedId, usuarioId, franja, items });
      return obtenerPorId(pedidoId);
    },
    cambiarEstado({ id, estado }) {
      cambiarEstadoStmt.run({ id, estado });
      return obtenerPorId(id);
    },
    buscarPorId(id) {
      return obtenerPorId(id);
    },
    listar({ estado, franja } = {}) {
      const condiciones = [];
      const valores = {};
      if (estado !== undefined) {
        condiciones.push('estado = @estado');
        valores.estado = estado;
      }
      if (franja !== undefined) {
        condiciones.push('franja = @franja');
        valores.franja = franja;
      }
      const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
      const filas = conexion.prepare(`SELECT * FROM pedidos ${where} ORDER BY creado_en`).all(valores);
      return filas.map(pedidoADominio);
    },
  };
}

module.exports = { crearPedidosRepositorio };
```

- [ ] **Step 5: Crear el servicio**

Crear `backend/src/servicios/pedidosServicio.js`:

```js
const { ErrorDeNegocio } = require('../utilidades/errores');

// Debe coincidir exactamente con el CHECK de la columna `estado` en
// backend/src/db/migraciones/007_crear_pedidos.sql. Clave "estadoActual->nuevoEstado".
const TRANSICIONES_PERMITIDAS = {
  'pendiente->en_preparacion': ['cocina'],
  'en_preparacion->listo': ['cocina'],
  'listo->entregado': ['mesero'],
  'pendiente->cancelado': ['mesero', 'cocina'],
  'en_preparacion->cancelado': ['mesero', 'cocina'],
};

function crearPedidosServicio({ pedidosRepositorio, huespedesRepositorio, platosRepositorio, derechoDeComidasServicio, inventarioServicio }) {
  function verificarHuespedExiste(huespedId) {
    if (!huespedesRepositorio.buscarPorId(huespedId)) {
      throw new ErrorDeNegocio(`El huésped ${huespedId} no existe`, { codigo: 'HUESPED_NO_ENCONTRADO', status: 404 });
    }
  }

  function verificarPlatoDisponible(platoId) {
    const plato = platosRepositorio.buscarPorId(platoId);
    if (!plato) {
      throw new ErrorDeNegocio(`El plato ${platoId} no existe`, { codigo: 'PLATO_NO_ENCONTRADO', status: 404 });
    }
    if (!plato.disponible) {
      throw new ErrorDeNegocio(`El plato ${platoId} no está disponible`, { codigo: 'PLATO_NO_DISPONIBLE', status: 409 });
    }
    return plato;
  }

  function verificarPedidoExiste(id) {
    const pedido = pedidosRepositorio.buscarPorId(id);
    if (!pedido) {
      throw new ErrorDeNegocio(`El pedido ${id} no existe`, { codigo: 'NO_ENCONTRADO', status: 404 });
    }
    return pedido;
  }

  return {
    crearPedido({ huespedId, usuarioId, franja, items }) {
      verificarHuespedExiste(huespedId);
      const itemsConPrecio = items.map((item) => {
        const plato = verificarPlatoDisponible(item.platoId);
        return { platoId: item.platoId, cantidad: item.cantidad, precioUnitario: plato.precio };
      });

      derechoDeComidasServicio.validarDerecho({ huespedId, franja });

      const pedido = pedidosRepositorio.crear({ huespedId, usuarioId, franja, items: itemsConPrecio });

      inventarioServicio.descontarPorPedido({ items: items.map((item) => ({ platoId: item.platoId, cantidad: item.cantidad })) });

      return pedido;
    },

    cambiarEstadoPedido({ id, nuevoEstado, rol }) {
      const pedido = verificarPedidoExiste(id);
      const clave = `${pedido.estado}->${nuevoEstado}`;
      const rolesPermitidos = TRANSICIONES_PERMITIDAS[clave];
      if (!rolesPermitidos) {
        throw new ErrorDeNegocio(`No se puede pasar de "${pedido.estado}" a "${nuevoEstado}"`, { codigo: 'TRANSICION_INVALIDA', status: 409 });
      }
      if (!rolesPermitidos.includes(rol)) {
        throw new ErrorDeNegocio('No tiene permiso para esta acción', { codigo: 'NO_AUTORIZADO', status: 403 });
      }
      return pedidosRepositorio.cambiarEstado({ id, estado: nuevoEstado });
    },

    obtenerPedidoPorId(id) {
      return verificarPedidoExiste(id);
    },

    listarPedidos({ estado, franja } = {}) {
      return pedidosRepositorio.listar({ estado, franja });
    },
  };
}

module.exports = { crearPedidosServicio };
```

- [ ] **Step 6: Crear el controlador**

Crear `backend/src/controladores/pedidosControlador.js`:

```js
function crearPedidosControlador({ pedidosServicio }) {
  return {
    crear(req, res) {
      const pedido = pedidosServicio.crearPedido({
        huespedId: req.body.huespedId,
        usuarioId: req.usuario.id,
        franja: req.body.franja,
        items: req.body.items,
      });
      res.status(201).json(pedido);
    },
    listar(req, res) {
      const { estado, franja } = req.query;
      res.json(pedidosServicio.listarPedidos({ estado, franja }));
    },
    obtenerPorId(req, res) {
      res.json(pedidosServicio.obtenerPedidoPorId(Number(req.params.id)));
    },
    cambiarEstado(req, res) {
      const pedido = pedidosServicio.cambiarEstadoPedido({
        id: Number(req.params.id),
        nuevoEstado: req.body.estado,
        rol: req.usuario.rol,
      });
      res.json(pedido);
    },
  };
}

module.exports = { crearPedidosControlador };
```

- [ ] **Step 7: Crear las rutas**

Crear `backend/src/rutas/pedidos.js`:

```js
const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');
const { validar } = require('../middlewares/validacion');
const { esquemaIdParametro } = require('../esquemas/comunEsquemas');
const { esquemaCrearPedido, esquemaCambiarEstadoPedido, esquemaFiltrarPedidos } = require('../esquemas/pedidosEsquemas');

function crearRutasPedidos({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereMesero = crearRequiereRol('mesero');

  router.get('/', requiereSesion, validar({ consulta: esquemaFiltrarPedidos }), controlador.listar);
  router.get('/:id', requiereSesion, validar({ parametros: esquemaIdParametro }), controlador.obtenerPorId);
  router.post('/', requiereSesion, requiereMesero, validar({ cuerpo: esquemaCrearPedido }), controlador.crear);
  router.patch('/:id/estado', requiereSesion, validar({ parametros: esquemaIdParametro, cuerpo: esquemaCambiarEstadoPedido }), controlador.cambiarEstado);

  return router;
}

module.exports = { crearRutasPedidos };
```

Nota: `PATCH /:id/estado` solo exige sesión, sin `requiereRol` fijo — el rol permitido depende de cuál transición se pide (ver `TRANSICIONES_PERMITIDAS` en el servicio), así que se valida dentro de `pedidosServicio.cambiarEstadoPedido`, no en la ruta.

- [ ] **Step 8: Registrar pedidos y los placeholders en el contenedor**

Reemplazar el contenido completo de `backend/src/contenedor.js`:

```js
// Contenedor de inyección de dependencias. Patrón reciclado de
// restaurante-app: cada repositorio se construye a partir de la conexión a
// BD, cada servicio recibe los repositorios (y otros servicios) que necesita
// por parámetro — nunca hace `require` directo de un repositorio. Así la
// lógica de negocio en servicios/ no depende de cómo se conecta a SQLite.
//
// El módulo que falta (ingredientes) se agrega aquí siguiendo el mismo
// patrón: repositorio primero, servicio después, registrar ambos abajo.

const { crearUsuariosRepositorio } = require('./modelos/usuariosRepositorio');
const { crearCategoriasRepositorio } = require('./modelos/categoriasRepositorio');
const { crearPlatosRepositorio } = require('./modelos/platosRepositorio');
const { crearHuespedesRepositorio } = require('./modelos/huespedesRepositorio');
const { crearPedidosRepositorio } = require('./modelos/pedidosRepositorio');
const { crearAutenticacionServicio } = require('./servicios/autenticacionServicio');
const { crearUsuariosServicio } = require('./servicios/usuariosServicio');
const { crearCategoriasServicio } = require('./servicios/categoriasServicio');
const { crearPlatosServicio } = require('./servicios/platosServicio');
const { crearHuespedesServicio } = require('./servicios/huespedesServicio');
const { crearPedidosServicio } = require('./servicios/pedidosServicio');

// TODO(compañero): reemplazar estos dos placeholders con la implementación
// real de derecho de comidas / descuento de inventario cuando existan — ver
// docs/superpowers/specs/2026-08-04-maquina-estados-comanda-design.md para
// la interfaz exacta. Solo hay que cambiar este registro, pedidosServicio
// no cambia.
const derechoDeComidasServicioPlaceholder = {
  validarDerecho() {}, // permite todo
};
const inventarioServicioPlaceholder = {
  descontarPorPedido() {}, // no hace nada
};

function crearContenedor(conexion) {
  const repositorios = {
    usuariosRepositorio: crearUsuariosRepositorio(conexion),
    categoriasRepositorio: crearCategoriasRepositorio(conexion),
    platosRepositorio: crearPlatosRepositorio(conexion),
    huespedesRepositorio: crearHuespedesRepositorio(conexion),
    pedidosRepositorio: crearPedidosRepositorio(conexion),
  };

  const autenticacionServicio = crearAutenticacionServicio({ usuariosRepositorio: repositorios.usuariosRepositorio });

  const servicios = {
    autenticacionServicio,
    usuariosServicio: crearUsuariosServicio({
      usuariosRepositorio: repositorios.usuariosRepositorio,
      autenticacionServicio,
    }),
    categoriasServicio: crearCategoriasServicio({
      categoriasRepositorio: repositorios.categoriasRepositorio,
    }),
    platosServicio: crearPlatosServicio({
      platosRepositorio: repositorios.platosRepositorio,
      categoriasRepositorio: repositorios.categoriasRepositorio,
    }),
    huespedesServicio: crearHuespedesServicio({
      huespedesRepositorio: repositorios.huespedesRepositorio,
    }),
    pedidosServicio: crearPedidosServicio({
      pedidosRepositorio: repositorios.pedidosRepositorio,
      huespedesRepositorio: repositorios.huespedesRepositorio,
      platosRepositorio: repositorios.platosRepositorio,
      derechoDeComidasServicio: derechoDeComidasServicioPlaceholder,
      inventarioServicio: inventarioServicioPlaceholder,
    }),
  };

  return { repositorios, servicios };
}

module.exports = { crearContenedor };
```

- [ ] **Step 9: Montar las rutas de pedidos en la app**

Reemplazar el contenido completo de `backend/src/app.js`:

```js
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const timeout = require('connect-timeout');
const { crearConfigSesion } = require('./config/sesion');
const { entorno } = require('./config/entorno');
const { crearRequiereSesion } = require('./middlewares/autenticacion');
const { crearLimitadorGeneral } = require('./middlewares/limitadorGeneral');
const { manejadorErrores } = require('./middlewares/manejadorErrores');
const { crearAutenticacionControlador } = require('./controladores/autenticacionControlador');
const { crearRutasAutenticacion } = require('./rutas/autenticacion');
const { crearUsuariosControlador } = require('./controladores/usuariosControlador');
const { crearRutasUsuarios } = require('./rutas/usuarios');
const { crearCategoriasControlador } = require('./controladores/categoriasControlador');
const { crearRutasCategorias } = require('./rutas/categorias');
const { crearPlatosControlador } = require('./controladores/platosControlador');
const { crearRutasPlatos } = require('./rutas/platos');
const { crearHuespedesControlador } = require('./controladores/huespedesControlador');
const { crearRutasHuespedes } = require('./rutas/huespedes');
const { crearPedidosControlador } = require('./controladores/pedidosControlador');
const { crearRutasPedidos } = require('./rutas/pedidos');

function crearApp(contenedor, { rutaSesionesDb } = {}) {
  const app = express();
  app.set('trust proxy', entorno.confiarEnProxy);
  app.use(helmet());
  app.use(timeout('5s'));
  app.use(express.json());
  app.use(session(crearConfigSesion(rutaSesionesDb)));
  app.use('/api', crearLimitadorGeneral());

  const requiereSesion = crearRequiereSesion({ usuariosServicio: contenedor.servicios.usuariosServicio });

  const autenticacionControlador = crearAutenticacionControlador({
    autenticacionServicio: contenedor.servicios.autenticacionServicio,
    usuariosServicio: contenedor.servicios.usuariosServicio,
  });
  app.use('/api/auth', crearRutasAutenticacion({ controlador: autenticacionControlador, requiereSesion }));

  const usuariosControlador = crearUsuariosControlador({ usuariosServicio: contenedor.servicios.usuariosServicio });
  app.use('/api/usuarios', crearRutasUsuarios({ controlador: usuariosControlador, requiereSesion }));

  const categoriasControlador = crearCategoriasControlador({ categoriasServicio: contenedor.servicios.categoriasServicio });
  app.use('/api/categorias', crearRutasCategorias({ controlador: categoriasControlador, requiereSesion }));

  const platosControlador = crearPlatosControlador({ platosServicio: contenedor.servicios.platosServicio });
  app.use('/api/platos', crearRutasPlatos({ controlador: platosControlador, requiereSesion }));

  const huespedesControlador = crearHuespedesControlador({ huespedesServicio: contenedor.servicios.huespedesServicio });
  app.use('/api/huespedes', crearRutasHuespedes({ controlador: huespedesControlador, requiereSesion }));

  const pedidosControlador = crearPedidosControlador({ pedidosServicio: contenedor.servicios.pedidosServicio });
  app.use('/api/pedidos', crearRutasPedidos({ controlador: pedidosControlador, requiereSesion }));

  // ---------------------------------------------------------------------
  // Rutas de negocio que faltan (ver docs/decisiones.md — reparto entre
  // las dos personas del equipo):
  //
  //   app.use('/api/ingredientes', crearRutasIngredientes({ ... }));
  //   app.use('/api/reportes', crearRutasReportes({ ... })); // incluye caja diaria
  // ---------------------------------------------------------------------

  const publicDir = path.join(__dirname, '../../frontend/public');
  app.use(express.static(publicDir));

  app.get('/login', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
  ['admin', 'mesero', 'cocina', 'jefeDeCaja'].forEach((rol) => {
    app.get(new RegExp(`^/${rol}(/.*)?$`), (req, res) => res.sendFile(path.join(publicDir, `${rol}.html`)));
  });
  app.get('/', (req, res) => res.redirect('/login'));

  app.use((req, res) => {
    res.status(404).json({ error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'Ruta no encontrada' } });
  });

  app.use(manejadorErrores);

  return app;
}

module.exports = { crearApp };
```

- [ ] **Step 10: Correr todos los tests y verificar que pasan**

Run: `cd backend && npm test`
Expected: PASS — 52 tests en total (39 previos + 13 nuevos de `pedidosRutas.test.js`).

- [ ] **Step 11: Commit**

```bash
git add backend/src/esquemas/pedidosEsquemas.js backend/src/modelos/pedidosRepositorio.js backend/src/servicios/pedidosServicio.js backend/src/controladores/pedidosControlador.js backend/src/rutas/pedidos.js backend/src/contenedor.js backend/src/app.js backend/tests/integracion/pedidosRutas.test.js
git commit -m "feat: maquina de estados de comanda (pedidos)" -m "Crear pedido valida huesped/plato/disponibilidad, llama a
derechoDeComidasServicio e inventarioServicio (placeholder temporal
en el contenedor), inserta pedido+items en una transaccion.
Transicion de estado generica con rol validado por transicion
especifica. 13 tests de integracion en verde."
```

---

### Task 3: Actualizar documentación de reparto de trabajo

**Files:**
- Modify: `docs/decisiones.md`

**Interfaces:** ninguna — cambio de texto únicamente.

- [ ] **Step 1: Actualizar la sección "Reparto de trabajo" en `docs/decisiones.md`**

Reemplazar este bloque:

```markdown
- **Esa persona**: adapta/recicla lo que ya existe — login, menú, máquina
  de estados de comanda. **Ya hecho: módulo de autenticación/usuarios**
  (login, sesión, rate limiting, CRUD de usuarios por rol) **y módulo de
  menú** (categorías y platos, CRUD completo con filtros de disponibilidad
  y categoría) — 32 tests de integración en verde. Ver
  `backend/src/{modelos,servicios,controladores,rutas}` y
  `backend/tests/integracion/`. Sigue: máquina de estados de comanda.
```

Por:

```markdown
- **Esa persona**: adapta/recicla lo que ya existe — login, menú, máquina
  de estados de comanda. **Ya hecho: módulo de autenticación/usuarios**,
  **módulo de menú** (categorías y platos) **y módulo de huéspedes +
  máquina de estados de comanda** (pedidos: crear con validación de
  huésped/plato/disponibilidad, transición de estado con rol por
  transición, cancelación) — 52 tests de integración en verde. Ver
  `backend/src/{modelos,servicios,controladores,rutas}` y
  `backend/tests/integracion/`.
  **Contrato listo para la otra persona**: `pedidosServicio` (en
  `backend/src/servicios/pedidosServicio.js`) ya llama
  `derechoDeComidasServicio.validarDerecho({huespedId, franja})` e
  `inventarioServicio.descontarPorPedido({items})` — ahora mismo apuntan
  a un placeholder en `backend/src/contenedor.js` (permite todo). Solo
  hay que reemplazar ese registro con la implementación real, respetando
  la misma firma; `pedidosServicio` no se toca. Ver
  `docs/superpowers/specs/2026-08-04-maquina-estados-comanda-design.md`
  para el detalle completo del contrato.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decisiones.md
git commit -m "docs: marcar huespedes y maquina de estados como completos" -m "52 tests de integracion en verde. Documenta el contrato de los dos
puntos de enganche (derecho de comidas, descuento de inventario)
para que la otra persona lo encuentre sin leer codigo."
```
