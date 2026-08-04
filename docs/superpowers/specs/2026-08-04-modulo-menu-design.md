# Diseño: módulo de menú (categorías y platos)

**Fecha**: 2026-08-04
**Estado**: aprobado, pendiente de implementación

## Contexto

Siguiendo el reparto de `docs/decisiones.md`, este módulo es el siguiente
paso de la persona que recicla `restaurante-app` (después de
autenticación/usuarios, ya construido y probado). Cubre gestión de
categorías y platos del menú del restaurante del hotel.

Las migraciones ya existen y no cambian en este diseño:
`003_crear_categorias.sql`, `004_crear_platos.sql`.

## Alcance

**Dentro**: CRUD de `categorias` y `platos` — repositorio, servicio,
controlador, rutas y tests de integración para ambos, siguiendo
exactamente el patrón de capas usado en `usuarios`
(`backend/src/{modelos,servicios,controladores,rutas}/usuarios*.js`).

**Fuera** (explícitamente, para evitar choques con la otra rama):

- `ingredientes` y la receta `plato_ingrediente` (migraciones `005` y
  `006`) — quedan para el módulo de inventario/descuento automático,
  que construye la otra persona del equipo.
- Frontend: `frontend/public/admin.html`/`admin.js` siguen como
  placeholder. Esta ronda es solo backend (API REST + tests), igual que
  se hizo con auth/usuarios antes de tener frontend.

## Arquitectura

Dos sub-módulos paralelos e independientes entre sí, mismo patrón que
`usuarios`: `rutas → controladores → servicios → modelos (repositorios)`,
cableados en `backend/src/contenedor.js` y montados en `backend/src/app.js`
(los comentarios que ya están ahí — `crearRutasCategorias`,
`crearRutasPlatos` — marcan exactamente dónde).

`platosServicio` depende de `categoriasRepositorio` (no del servicio de
categorías) únicamente para verificar que la categoría exista al crear o
editar un plato — misma forma de dependencia acotada que ya usan
`autenticacionServicio`/`usuariosServicio` en el contenedor.

## Categorías

### API

| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| GET | `/api/categorias` | cualquier sesión activa | lista todas, ordenadas por nombre |
| POST | `/api/categorias` | admin | crea; 409 `CATEGORIA_DUPLICADA` si el nombre ya existe |
| PUT | `/api/categorias/:id` | admin | renombra; 404 si no existe, 409 si el nuevo nombre choca con otra categoría |

Sin `DELETE` — decisión explícita. La tabla `categorias` no tiene columna
`activo` y `platos.categoria_id` la referencia con foreign keys en `ON`
(`backend/src/db/conexion.js`); borrar categorías introduciría el problema
de qué hacer con sus platos. Si una categoría queda mal creada, se
renombra. Simplifica el MVP sin perder funcionalidad real.

### Esquemas (`backend/src/esquemas/categoriasEsquemas.js`)

```js
esquemaCrearCategoria = z.object({ nombre: z.string().min(1).max(80) }).strict();
esquemaActualizarCategoria = z.object({ nombre: z.string().min(1).max(80) }).strict();
```

### Repositorio (`backend/src/modelos/categoriasRepositorio.js`)

Métodos: `crear({ nombre })`, `actualizar({ id, nombre })`,
`buscarPorId(id)`, `buscarPorNombre(nombre)`, `listarTodas()` — mismo
estilo (`prepare` una vez, función `aDominio` para mapear filas) que
`usuariosRepositorio.js`.

### Servicio (`backend/src/servicios/categoriasServicio.js`)

- `crearCategoria({ nombre })` — 409 `CATEGORIA_DUPLICADA` si
  `buscarPorNombre` ya devuelve algo.
- `actualizarCategoria({ id, nombre })` — 404 `NO_ENCONTRADO` si no
  existe; 409 `CATEGORIA_DUPLICADA` si el nuevo nombre choca con **otra**
  categoría (no consigo mismo).
- `listarCategorias()`.

## Platos

### API

| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| GET | `/api/platos` | cualquier sesión activa | lista; filtros opcionales de query `categoriaId` y `disponible` |
| POST | `/api/platos` | admin | crea; 404 `CATEGORIA_NO_ENCONTRADA` si `categoriaId` no existe |
| PUT | `/api/platos/:id` | admin | edita nombre/precio/informacion/categoriaId; 404 si el plato o la nueva categoría no existen |
| PATCH | `/api/platos/:id/disponibilidad` | admin | activa/desactiva; mismo patrón que `PATCH /usuarios/:id/estado` |

### Esquemas (`backend/src/esquemas/platosEsquemas.js`)

```js
esquemaCrearPlato = z.object({
  categoriaId: z.coerce.number().int().positive(),
  nombre: z.string().min(1).max(100),
  precio: z.number().int().min(0),
  informacion: z.string().max(500).optional(),
}).strict();

esquemaActualizarPlato = // mismos campos que crear, todos requeridos

esquemaCambiarDisponibilidadPlato = z.object({ disponible: z.boolean() }).strict();

esquemaFiltrarPlatos = z.object({
  categoriaId: z.coerce.number().int().positive().optional(),
  disponible: z.coerce.boolean().optional(),
}).strict();
```

`esquemaFiltrarPlatos` se aplica en la ruta GET vía
`validar({ consulta: esquemaFiltrarPlatos })` (el middleware
`backend/src/middlewares/validacion.js` ya soporta validar `req.query`
bajo la clave `consulta`) — el controlador no necesita lógica especial
para parsear filtros, ya llegan tipados a `req.query`.

### Repositorio (`backend/src/modelos/platosRepositorio.js`)

Métodos: `crear`, `actualizar`, `cambiarDisponibilidad`, `buscarPorId`,
`listar({ categoriaId, disponible })`. El detalle de cómo se arma el
`SELECT` con filtros opcionales (WHERE dinámico vs. statements fijos
combinados) se decide en implementación — es interno al repositorio, no
afecta la interfaz pública ni los tests.

### Servicio (`backend/src/servicios/platosServicio.js`)

- `crearPlato({ categoriaId, nombre, precio, informacion })` — 404
  `CATEGORIA_NO_ENCONTRADA` si `categoriasRepositorio.buscarPorId` no
  encuentra la categoría.
- `actualizarPlato({ id, categoriaId, nombre, precio, informacion })` —
  404 `PLATO_NO_ENCONTRADO` si el plato no existe, 404
  `CATEGORIA_NO_ENCONTRADA` si la nueva categoría no existe.
- `cambiarDisponibilidadPlato({ id, disponible })` — 404
  `PLATO_NO_ENCONTRADO` si no existe.
- `listarPlatos({ categoriaId, disponible })`.

## Manejo de errores

Reutiliza `ErrorDeNegocio`/`ErrorNoEncontrado`
(`backend/src/utilidades/errores.js`) y el `manejadorErrores` global —
nada nuevo en esa capa. Códigos nuevos:

- `CATEGORIA_DUPLICADA` — 409
- `CATEGORIA_NO_ENCONTRADA` — 404
- `PLATO_NO_ENCONTRADO` — 404

422 `DATOS_INVALIDOS` (validación zod), 401 `NO_AUTENTICADO`, 403
`NO_AUTORIZADO` ya están cubiertos por middlewares existentes
(`crearRequiereSesion`, `crearRequiereRol`, `validar`).

## Testing

`backend/tests/integracion/categoriasRutas.test.js` y
`platosRutas.test.js`, mismo estilo que `usuariosRutas.test.js`
(`supertest` + `crearAppDePrueba`):

**Categorías**:
- admin crea categoría → 201
- no-admin recibe 403 al crear
- crear con nombre duplicado → 409 `CATEGORIA_DUPLICADA`
- crear con nombre vacío → 422 `DATOS_INVALIDOS`
- GET lista categorías → 200, array
- admin renombra categoría → 200
- renombrar a un id inexistente → 404

**Platos**:
- admin crea plato con categoría válida → 201
- crear plato con `categoriaId` inexistente → 404 `CATEGORIA_NO_ENCONTRADA`
- no-admin recibe 403 al crear
- crear con precio negativo → 422 `DATOS_INVALIDOS`
- GET lista todos los platos → 200, array
- GET con `?categoriaId=` filtra correctamente
- GET con `?disponible=false` filtra correctamente
- admin edita un plato → 200
- `PATCH /:id/disponibilidad` desactiva un plato → 200

~14–16 tests entre ambos módulos, densidad similar a auth/usuarios.

## Cambios en archivos existentes

- `backend/src/contenedor.js`: registrar `categoriasRepositorio`,
  `platosRepositorio`, `categoriasServicio`, `platosServicio`.
- `backend/src/app.js`: montar `/api/categorias` y `/api/platos`,
  reemplazando los comentarios de rutas pendientes ya presentes.
- `docs/decisiones.md`: marcar menú como hecho en el reparto de trabajo,
  igual que se hizo con auth/usuarios.
