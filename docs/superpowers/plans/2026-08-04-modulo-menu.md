# Módulo de menú (categorías y platos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el CRUD backend de categorías y platos del menú (API REST + tests de integración), siguiendo exactamente el patrón de capas ya usado en el módulo de autenticación/usuarios.

**Architecture:** Dos sub-módulos paralelos (`categorias`, `platos`), cada uno con capas `rutas → controladores → servicios → modelos (repositorios)`, cableados en `backend/src/contenedor.js` y montados en `backend/src/app.js`. `platosServicio` depende de `categoriasRepositorio` (no del servicio) para verificar que la categoría de un plato exista.

**Tech Stack:** Node.js + Express, better-sqlite3, zod, `node --test` + supertest (igual que el resto del backend).

## Global Constraints

- Seguir el patrón de capas ya usado en `usuarios` (`rutas → controladores → servicios → modelos`) — ver `backend/src/{modelos,servicios,controladores,rutas}/usuarios*.js` como referencia exacta de estilo.
- Queries SQL siempre parametrizadas (`conexion.prepare(...).run(valores)`), nunca concatenar SQL con datos de entrada.
- Validación de entrada con zod, esquemas `.strict()` (rechaza campos no declarados).
- Controladores sin lógica de negocio — solo leen `req`, llaman al servicio, mapean a status HTTP.
- Errores de negocio vía `ErrorDeNegocio`/`ErrorNoEncontrado` (`backend/src/utilidades/errores.js`), nunca `res.status()` directo en el servicio.
- Sin `DELETE` para categorías (decisión del spec — evita el problema de FK con `platos.categoria_id`).
- Sin cambios de frontend en este plan — `frontend/public/admin.html` sigue como placeholder.
- Los commits de este repo **no** llevan línea `Co-Authored-By: Claude ...` — omitirla en todos los `git commit` de este plan.
- Spec de referencia: `docs/superpowers/specs/2026-08-04-modulo-menu-design.md`.

---

### Task 1: Módulo de categorías

**Files:**
- Create: `backend/src/esquemas/categoriasEsquemas.js`
- Create: `backend/src/modelos/categoriasRepositorio.js`
- Create: `backend/src/servicios/categoriasServicio.js`
- Create: `backend/src/controladores/categoriasControlador.js`
- Create: `backend/src/rutas/categorias.js`
- Modify: `backend/src/contenedor.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/integracion/categoriasRutas.test.js`

**Interfaces:**
- Produces: `crearCategoriasRepositorio(conexion)` → `{ crear({nombre}), actualizar({id,nombre}), buscarPorId(id), buscarPorNombre(nombre), listarTodas() }`, cada uno devuelve/lista objetos `{ id, nombre }`.
- Produces: `crearCategoriasServicio({ categoriasRepositorio })` → `{ crearCategoria({nombre}), actualizarCategoria({id,nombre}), listarCategorias() }`.
- Produces: en `contenedor.js`, `contenedor.repositorios.categoriasRepositorio` y `contenedor.servicios.categoriasServicio` — Task 2 los consume.
- Produces: rutas montadas en `/api/categorias` (GET público-con-sesión, POST/PUT solo admin).

- [ ] **Step 1: Escribir el archivo de tests de integración (fallará — nada existe todavía)**

Crear `backend/tests/integracion/categoriasRutas.test.js`:

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
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd backend && npm test -- --test-name-pattern="categoría|categorías"`
Expected: FAIL — `Cannot find module '../ayudas/appDePrueba'` no (ese ya existe); fallará con 404 en cada request porque `/api/categorias` no existe todavía (rutas no montadas) o con error de import si algo falta. Confirmar que el fallo es por ausencia de la ruta, no por un typo en el test.

- [ ] **Step 3: Crear el esquema de validación**

Crear `backend/src/esquemas/categoriasEsquemas.js`:

```js
const { z } = require('zod');

const esquemaCrearCategoria = z.object({
  nombre: z.string().min(1).max(80),
}).strict();

const esquemaActualizarCategoria = z.object({
  nombre: z.string().min(1).max(80),
}).strict();

module.exports = { esquemaCrearCategoria, esquemaActualizarCategoria };
```

- [ ] **Step 4: Crear el repositorio**

Crear `backend/src/modelos/categoriasRepositorio.js`:

```js
function crearCategoriasRepositorio(conexion) {
  const insertar = conexion.prepare('INSERT INTO categorias (nombre) VALUES (@nombre)');
  const actualizar = conexion.prepare('UPDATE categorias SET nombre = @nombre WHERE id = @id');
  const buscarPorIdStmt = conexion.prepare('SELECT * FROM categorias WHERE id = ?');
  const buscarPorNombreStmt = conexion.prepare('SELECT * FROM categorias WHERE nombre = ?');
  const listarTodasStmt = conexion.prepare('SELECT * FROM categorias ORDER BY nombre');

  function aDominio(fila) {
    if (!fila) return null;
    return { id: fila.id, nombre: fila.nombre };
  }

  function obtenerPorId(id) {
    return aDominio(buscarPorIdStmt.get(id));
  }

  return {
    crear({ nombre }) {
      const resultado = insertar.run({ nombre });
      return obtenerPorId(resultado.lastInsertRowid);
    },
    actualizar({ id, nombre }) {
      actualizar.run({ id, nombre });
      return obtenerPorId(id);
    },
    buscarPorId(id) {
      return obtenerPorId(id);
    },
    buscarPorNombre(nombre) {
      return aDominio(buscarPorNombreStmt.get(nombre));
    },
    listarTodas() {
      return listarTodasStmt.all().map(aDominio);
    },
  };
}

module.exports = { crearCategoriasRepositorio };
```

- [ ] **Step 5: Crear el servicio**

Crear `backend/src/servicios/categoriasServicio.js`:

```js
const { ErrorDeNegocio, ErrorNoEncontrado } = require('../utilidades/errores');

function crearCategoriasServicio({ categoriasRepositorio }) {
  return {
    crearCategoria({ nombre }) {
      if (categoriasRepositorio.buscarPorNombre(nombre)) {
        throw new ErrorDeNegocio(`Ya existe una categoría con el nombre ${nombre}`, { codigo: 'CATEGORIA_DUPLICADA', status: 409 });
      }
      return categoriasRepositorio.crear({ nombre });
    },

    actualizarCategoria({ id, nombre }) {
      if (!categoriasRepositorio.buscarPorId(id)) {
        throw new ErrorNoEncontrado(`La categoría ${id} no existe`);
      }
      const existente = categoriasRepositorio.buscarPorNombre(nombre);
      if (existente && existente.id !== id) {
        throw new ErrorDeNegocio(`Ya existe una categoría con el nombre ${nombre}`, { codigo: 'CATEGORIA_DUPLICADA', status: 409 });
      }
      return categoriasRepositorio.actualizar({ id, nombre });
    },

    listarCategorias() {
      return categoriasRepositorio.listarTodas();
    },
  };
}

module.exports = { crearCategoriasServicio };
```

- [ ] **Step 6: Crear el controlador**

Crear `backend/src/controladores/categoriasControlador.js`:

```js
function crearCategoriasControlador({ categoriasServicio }) {
  return {
    listar(req, res) {
      res.json(categoriasServicio.listarCategorias());
    },
    crear(req, res) {
      const categoria = categoriasServicio.crearCategoria({ nombre: req.body.nombre });
      res.status(201).json(categoria);
    },
    actualizar(req, res) {
      const categoria = categoriasServicio.actualizarCategoria({ id: Number(req.params.id), nombre: req.body.nombre });
      res.json(categoria);
    },
  };
}

module.exports = { crearCategoriasControlador };
```

- [ ] **Step 7: Crear las rutas**

Crear `backend/src/rutas/categorias.js`:

```js
const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');
const { validar } = require('../middlewares/validacion');
const { esquemaIdParametro } = require('../esquemas/comunEsquemas');
const { esquemaCrearCategoria, esquemaActualizarCategoria } = require('../esquemas/categoriasEsquemas');

function crearRutasCategorias({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereAdmin = crearRequiereRol('admin');

  router.get('/', requiereSesion, controlador.listar);
  router.post('/', requiereSesion, requiereAdmin, validar({ cuerpo: esquemaCrearCategoria }), controlador.crear);
  router.put('/:id', requiereSesion, requiereAdmin, validar({ parametros: esquemaIdParametro, cuerpo: esquemaActualizarCategoria }), controlador.actualizar);

  return router;
}

module.exports = { crearRutasCategorias };
```

- [ ] **Step 8: Registrar categorías en el contenedor de inyección de dependencias**

Reemplazar el contenido completo de `backend/src/contenedor.js`:

```js
// Contenedor de inyección de dependencias. Patrón reciclado de
// restaurante-app: cada repositorio se construye a partir de la conexión a
// BD, cada servicio recibe los repositorios (y otros servicios) que necesita
// por parámetro — nunca hace `require` directo de un repositorio. Así la
// lógica de negocio en servicios/ no depende de cómo se conecta a SQLite.
//
// Los módulos que faltan (huéspedes, platos, ingredientes, pedidos) se
// agregan aquí siguiendo el mismo patrón: repositorio primero, servicio
// después, registrar ambos abajo.

const { crearUsuariosRepositorio } = require('./modelos/usuariosRepositorio');
const { crearCategoriasRepositorio } = require('./modelos/categoriasRepositorio');
const { crearAutenticacionServicio } = require('./servicios/autenticacionServicio');
const { crearUsuariosServicio } = require('./servicios/usuariosServicio');
const { crearCategoriasServicio } = require('./servicios/categoriasServicio');

function crearContenedor(conexion) {
  const repositorios = {
    usuariosRepositorio: crearUsuariosRepositorio(conexion),
    categoriasRepositorio: crearCategoriasRepositorio(conexion),
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
  };

  return { repositorios, servicios };
}

module.exports = { crearContenedor };
```

- [ ] **Step 9: Montar las rutas de categorías en la app**

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

  // ---------------------------------------------------------------------
  // Rutas de negocio que faltan (ver docs/decisiones.md — reparto entre
  // las dos personas del equipo):
  //
  //   app.use('/api/huespedes', crearRutasHuespedes({ ... }));
  //   app.use('/api/platos', crearRutasPlatos({ ... }));
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
Expected: PASS — los 16 tests previos de auth/usuarios siguen en verde, más los 7 nuevos de `categoriasRutas.test.js` (23 en total).

- [ ] **Step 11: Commit**

```bash
git add backend/src/esquemas/categoriasEsquemas.js backend/src/modelos/categoriasRepositorio.js backend/src/servicios/categoriasServicio.js backend/src/controladores/categoriasControlador.js backend/src/rutas/categorias.js backend/src/contenedor.js backend/src/app.js backend/tests/integracion/categoriasRutas.test.js
git commit -m "feat: modulo de categorias del menu" -m "CRUD de categorias (crear/listar/renombrar, sin delete para evitar
el problema de FK con platos.categoria_id). Solo admin escribe,
cualquier sesion activa lee. 7 tests de integracion en verde."
```

---

### Task 2: Módulo de platos

**Files:**
- Create: `backend/src/esquemas/platosEsquemas.js`
- Create: `backend/src/modelos/platosRepositorio.js`
- Create: `backend/src/servicios/platosServicio.js`
- Create: `backend/src/controladores/platosControlador.js`
- Create: `backend/src/rutas/platos.js`
- Modify: `backend/src/contenedor.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/integracion/platosRutas.test.js`

**Interfaces:**
- Consumes: `contenedor.repositorios.categoriasRepositorio.buscarPorId(id)` → `{id, nombre} | null` (de Task 1).
- Consumes: `crearRequiereRol`, `validar`, `esquemaIdParametro` — ya existentes (`backend/src/middlewares/autenticacion.js`, `backend/src/middlewares/validacion.js`, `backend/src/esquemas/comunEsquemas.js`).
- Produces: `crearPlatosRepositorio(conexion)` → `{ crear, actualizar, cambiarDisponibilidad, buscarPorId, listar({categoriaId, disponible}) }`, objetos de dominio `{ id, categoriaId, nombre, precio, informacion, disponible, creadoEn }`.
- Produces: rutas montadas en `/api/platos` (GET público-con-sesión con filtros de query, POST/PUT/PATCH solo admin).

**Nota importante de zod**: `z.coerce.boolean()` NO sirve para el filtro `?disponible=false` — internamente hace `Boolean("false")`, que es `true` (cualquier string no vacío es verdadero). El esquema de filtro usa `z.enum(['true','false']).transform(v => v === 'true')` en su lugar. Ver Step 3.

- [ ] **Step 1: Escribir el archivo de tests de integración (fallará — nada existe todavía)**

Crear `backend/tests/integracion/platosRutas.test.js`:

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
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd backend && npm test -- --test-name-pattern="plato"`
Expected: FAIL — `/api/platos` no existe todavía (404 de la ruta catch-all, o error de import).

- [ ] **Step 3: Crear el esquema de validación**

Crear `backend/src/esquemas/platosEsquemas.js`:

```js
const { z } = require('zod');

const camposPlato = {
  categoriaId: z.coerce.number().int().positive(),
  nombre: z.string().min(1).max(100),
  precio: z.number().int().min(0),
  informacion: z.string().max(500).optional(),
};

const esquemaCrearPlato = z.object(camposPlato).strict();
const esquemaActualizarPlato = z.object(camposPlato).strict();

const esquemaCambiarDisponibilidadPlato = z.object({
  disponible: z.boolean(),
}).strict();

// z.coerce.boolean() NO sirve aquí: internamente hace Boolean(valor), y
// cualquier string no vacío (incluido "false") es verdadero en JS. Se usa
// un enum + transform para que "?disponible=false" se interprete bien.
const disponibleQueryBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

const esquemaFiltrarPlatos = z.object({
  categoriaId: z.coerce.number().int().positive().optional(),
  disponible: disponibleQueryBooleano.optional(),
}).strict();

module.exports = {
  esquemaCrearPlato,
  esquemaActualizarPlato,
  esquemaCambiarDisponibilidadPlato,
  esquemaFiltrarPlatos,
};
```

- [ ] **Step 4: Crear el repositorio**

Crear `backend/src/modelos/platosRepositorio.js`:

```js
function crearPlatosRepositorio(conexion) {
  const insertar = conexion.prepare(`
    INSERT INTO platos (categoria_id, nombre, precio, informacion, disponible, creado_en)
    VALUES (@categoriaId, @nombre, @precio, @informacion, 1, @creadoEn)
  `);
  const actualizar = conexion.prepare(`
    UPDATE platos SET categoria_id = @categoriaId, nombre = @nombre, precio = @precio, informacion = @informacion WHERE id = @id
  `);
  const cambiarDisponibilidad = conexion.prepare('UPDATE platos SET disponible = @disponible WHERE id = @id');
  const buscarPorIdStmt = conexion.prepare('SELECT * FROM platos WHERE id = ?');

  function aDominio(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      categoriaId: fila.categoria_id,
      nombre: fila.nombre,
      precio: fila.precio,
      informacion: fila.informacion,
      disponible: Boolean(fila.disponible),
      creadoEn: fila.creado_en,
    };
  }

  function obtenerPorId(id) {
    return aDominio(buscarPorIdStmt.get(id));
  }

  return {
    crear({ categoriaId, nombre, precio, informacion }) {
      const creadoEn = new Date().toISOString();
      const resultado = insertar.run({ categoriaId, nombre, precio, informacion: informacion ?? null, creadoEn });
      return obtenerPorId(resultado.lastInsertRowid);
    },
    actualizar({ id, categoriaId, nombre, precio, informacion }) {
      actualizar.run({ id, categoriaId, nombre, precio, informacion: informacion ?? null });
      return obtenerPorId(id);
    },
    cambiarDisponibilidad({ id, disponible }) {
      cambiarDisponibilidad.run({ id, disponible: disponible ? 1 : 0 });
      return obtenerPorId(id);
    },
    buscarPorId(id) {
      return obtenerPorId(id);
    },
    listar({ categoriaId, disponible } = {}) {
      const condiciones = [];
      const valores = {};
      if (categoriaId !== undefined) {
        condiciones.push('categoria_id = @categoriaId');
        valores.categoriaId = categoriaId;
      }
      if (disponible !== undefined) {
        condiciones.push('disponible = @disponible');
        valores.disponible = disponible ? 1 : 0;
      }
      const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
      const filas = conexion.prepare(`SELECT * FROM platos ${where} ORDER BY nombre`).all(valores);
      return filas.map(aDominio);
    },
  };
}

module.exports = { crearPlatosRepositorio };
```

- [ ] **Step 5: Crear el servicio**

Crear `backend/src/servicios/platosServicio.js`:

```js
const { ErrorDeNegocio } = require('../utilidades/errores');

function crearPlatosServicio({ platosRepositorio, categoriasRepositorio }) {
  function verificarCategoriaExiste(categoriaId) {
    if (!categoriasRepositorio.buscarPorId(categoriaId)) {
      throw new ErrorDeNegocio(`La categoría ${categoriaId} no existe`, { codigo: 'CATEGORIA_NO_ENCONTRADA', status: 404 });
    }
  }

  function verificarPlatoExiste(id) {
    if (!platosRepositorio.buscarPorId(id)) {
      throw new ErrorDeNegocio(`El plato ${id} no existe`, { codigo: 'PLATO_NO_ENCONTRADO', status: 404 });
    }
  }

  return {
    crearPlato({ categoriaId, nombre, precio, informacion }) {
      verificarCategoriaExiste(categoriaId);
      return platosRepositorio.crear({ categoriaId, nombre, precio, informacion });
    },

    actualizarPlato({ id, categoriaId, nombre, precio, informacion }) {
      verificarPlatoExiste(id);
      verificarCategoriaExiste(categoriaId);
      return platosRepositorio.actualizar({ id, categoriaId, nombre, precio, informacion });
    },

    cambiarDisponibilidadPlato({ id, disponible }) {
      verificarPlatoExiste(id);
      return platosRepositorio.cambiarDisponibilidad({ id, disponible });
    },

    listarPlatos({ categoriaId, disponible } = {}) {
      return platosRepositorio.listar({ categoriaId, disponible });
    },
  };
}

module.exports = { crearPlatosServicio };
```

- [ ] **Step 6: Crear el controlador**

Crear `backend/src/controladores/platosControlador.js`:

```js
function crearPlatosControlador({ platosServicio }) {
  return {
    listar(req, res) {
      const { categoriaId, disponible } = req.query;
      res.json(platosServicio.listarPlatos({ categoriaId, disponible }));
    },
    crear(req, res) {
      const plato = platosServicio.crearPlato({
        categoriaId: req.body.categoriaId,
        nombre: req.body.nombre,
        precio: req.body.precio,
        informacion: req.body.informacion,
      });
      res.status(201).json(plato);
    },
    actualizar(req, res) {
      const plato = platosServicio.actualizarPlato({
        id: Number(req.params.id),
        categoriaId: req.body.categoriaId,
        nombre: req.body.nombre,
        precio: req.body.precio,
        informacion: req.body.informacion,
      });
      res.json(plato);
    },
    cambiarDisponibilidad(req, res) {
      const plato = platosServicio.cambiarDisponibilidadPlato({ id: Number(req.params.id), disponible: req.body.disponible });
      res.json(plato);
    },
  };
}

module.exports = { crearPlatosControlador };
```

- [ ] **Step 7: Crear las rutas**

Crear `backend/src/rutas/platos.js`:

```js
const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');
const { validar } = require('../middlewares/validacion');
const { esquemaIdParametro } = require('../esquemas/comunEsquemas');
const {
  esquemaCrearPlato,
  esquemaActualizarPlato,
  esquemaCambiarDisponibilidadPlato,
  esquemaFiltrarPlatos,
} = require('../esquemas/platosEsquemas');

function crearRutasPlatos({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereAdmin = crearRequiereRol('admin');

  router.get('/', requiereSesion, validar({ consulta: esquemaFiltrarPlatos }), controlador.listar);
  router.post('/', requiereSesion, requiereAdmin, validar({ cuerpo: esquemaCrearPlato }), controlador.crear);
  router.put('/:id', requiereSesion, requiereAdmin, validar({ parametros: esquemaIdParametro, cuerpo: esquemaActualizarPlato }), controlador.actualizar);
  router.patch('/:id/disponibilidad', requiereSesion, requiereAdmin, validar({ parametros: esquemaIdParametro, cuerpo: esquemaCambiarDisponibilidadPlato }), controlador.cambiarDisponibilidad);

  return router;
}

module.exports = { crearRutasPlatos };
```

- [ ] **Step 8: Registrar platos en el contenedor de inyección de dependencias**

Reemplazar el contenido completo de `backend/src/contenedor.js`:

```js
// Contenedor de inyección de dependencias. Patrón reciclado de
// restaurante-app: cada repositorio se construye a partir de la conexión a
// BD, cada servicio recibe los repositorios (y otros servicios) que necesita
// por parámetro — nunca hace `require` directo de un repositorio. Así la
// lógica de negocio en servicios/ no depende de cómo se conecta a SQLite.
//
// Los módulos que faltan (huéspedes, ingredientes, pedidos) se agregan
// aquí siguiendo el mismo patrón: repositorio primero, servicio después,
// registrar ambos abajo.

const { crearUsuariosRepositorio } = require('./modelos/usuariosRepositorio');
const { crearCategoriasRepositorio } = require('./modelos/categoriasRepositorio');
const { crearPlatosRepositorio } = require('./modelos/platosRepositorio');
const { crearAutenticacionServicio } = require('./servicios/autenticacionServicio');
const { crearUsuariosServicio } = require('./servicios/usuariosServicio');
const { crearCategoriasServicio } = require('./servicios/categoriasServicio');
const { crearPlatosServicio } = require('./servicios/platosServicio');

function crearContenedor(conexion) {
  const repositorios = {
    usuariosRepositorio: crearUsuariosRepositorio(conexion),
    categoriasRepositorio: crearCategoriasRepositorio(conexion),
    platosRepositorio: crearPlatosRepositorio(conexion),
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
  };

  return { repositorios, servicios };
}

module.exports = { crearContenedor };
```

- [ ] **Step 9: Montar las rutas de platos en la app**

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

  // ---------------------------------------------------------------------
  // Rutas de negocio que faltan (ver docs/decisiones.md — reparto entre
  // las dos personas del equipo):
  //
  //   app.use('/api/huespedes', crearRutasHuespedes({ ... }));
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

- [ ] **Step 10: Correr todos los tests y verificar que pasan**

Run: `cd backend && npm test`
Expected: PASS — 32 tests en total (16 previos de auth/usuarios + 7 de categorías + 9 de platos).

- [ ] **Step 11: Commit**

```bash
git add backend/src/esquemas/platosEsquemas.js backend/src/modelos/platosRepositorio.js backend/src/servicios/platosServicio.js backend/src/controladores/platosControlador.js backend/src/rutas/platos.js backend/src/contenedor.js backend/src/app.js backend/tests/integracion/platosRutas.test.js
git commit -m "feat: modulo de platos del menu" -m "CRUD de platos (crear/listar-con-filtros/editar/cambiar
disponibilidad), valida que la categoria exista al crear o editar.
9 tests de integracion en verde."
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
  (login, sesión, rate limiting, CRUD de usuarios por rol, 16 tests en
  verde) — ver `backend/src/{modelos,servicios,controladores,rutas}` y
  `backend/tests/integracion/{autenticacionRutas,usuariosRutas}.test.js`.
  Sigue: menú (categorías/platos) y máquina de estados de comanda.
```

Por:

```markdown
- **Esa persona**: adapta/recicla lo que ya existe — login, menú, máquina
  de estados de comanda. **Ya hecho: módulo de autenticación/usuarios**
  (login, sesión, rate limiting, CRUD de usuarios por rol) **y módulo de
  menú** (categorías y platos, CRUD completo con filtros de disponibilidad
  y categoría) — 32 tests de integración en verde. Ver
  `backend/src/{modelos,servicios,controladores,rutas}` y
  `backend/tests/integracion/`. Sigue: máquina de estados de comanda.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decisiones.md
git commit -m "docs: marcar modulo de menu como completo en el reparto" -m "32 tests de integracion en verde (16 auth/usuarios + 7 categorias +
9 platos)."
```
