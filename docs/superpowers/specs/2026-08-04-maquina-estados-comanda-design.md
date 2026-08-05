# Diseño: máquina de estados de comanda (pedidos) + prerequisito de huéspedes

**Fecha**: 2026-08-04
**Estado**: aprobado, pendiente de implementación

## Contexto

Siguiendo `docs/decisiones.md`, este es el siguiente paso de la persona que
recicla `restaurante-app` (después de autenticación/usuarios y menú, ambos
construidos y probados). Cubre la comanda: el mesero registra un pedido
para un huésped, y el pedido avanza por una máquina de estados hasta
`entregado` (o se cancela).

Las migraciones ya existen y no cambian: `007_crear_pedidos.sql`,
`008_crear_items_pedido.sql`. La de huéspedes (`002_crear_huespedes.sql`)
también existe.

**Gap de alcance detectado y resuelto durante el brainstorming**:
`docs/decisiones.md` no asignaba el módulo de huéspedes a nadie, pero
`pedidos.huesped_id` depende de él. Se decidió que esta misma persona lo
construye como prerequisito mínimo (Task 0 del plan), no como parte del
ticket de la otra persona.

## Alcance

**Dentro**:
- Módulo de huéspedes mínimo: crear + buscar por documento.
- Módulo de pedidos: crear comanda (con items, todo en una petición),
  listar/leer, transición de estado genérica con validación de rol por
  transición específica.
- Definición e inyección de dos puntos de enganche (`derechoDeComidasServicio`,
  `inventarioServicio`) con un placeholder temporal para que la app completa
  arranque y los tests corran hoy, sin esperar al otro módulo.

**Fuera** (explícitamente, para no chocar con la otra rama):
- La implementación real de `derechoDeComidasServicio.validarDerecho` y
  `inventarioServicio.descontarPorPedido` — las construye la otra persona
  del equipo. Este plan solo define su interfaz y registra un placeholder.
- CRUD completo de huéspedes (editar, listar todos, desactivar) — solo lo
  mínimo que la comanda necesita.
- Caja diaria (reporte de comandas entregadas del día) — pieza de la otra
  persona, que puede consultar `pedidos`/`items_pedido` directamente una
  vez existan.
- Frontend — solo backend en esta ronda, igual que en los módulos previos.

## Arquitectura

Dos sub-módulos nuevos, mismo patrón de capas
(`rutas → controladores → servicios → modelos`) cableados en
`backend/src/contenedor.js` y montados en `backend/src/app.js`.

1. **Huéspedes**: `huespedesRepositorio` + `huespedesServicio`.
2. **Pedidos**: `pedidosRepositorio` (una tabla `pedidos` + una tabla
   `items_pedido`, un solo repositorio ya que siempre se leen/escriben
   juntos) + `pedidosServicio`, que depende de `huespedesRepositorio`
   (verificar que el huésped exista), `platosRepositorio` (verificar que
   cada plato exista, esté disponible, y copiar su precio) —
   misma forma de dependencia acotada que `platosServicio → categoriasRepositorio`.

### Puntos de enganche con el módulo de la otra persona

`pedidosServicio` recibe por inyección de dependencias
`derechoDeComidasServicio` e `inventarioServicio`. Interfaces exactas
(el contrato que debe respetar la implementación real cuando llegue):

```js
// derechoDeComidasServicio.validarDerecho({ huespedId, franja })
// No retorna nada si el huésped tiene derecho a comer en esa franja hoy.
// Lanza ErrorDeNegocio (código a elección de quien lo implemente, p.ej.
// DERECHO_COMIDAS_EXCEDIDO, status 409) si no.

// inventarioServicio.descontarPorPedido({ items })
// items = [{ platoId, cantidad }]
// No retorna nada si hay stock suficiente y ya descontó.
// Lanza ErrorDeNegocio si no hay stock.
```

#### Detalles que el contrato no cubre todavía

- **Un `throw` de `descontarPorPedido` no revierte el pedido.**
  `pedidosRepositorio.crear` ya hizo commit de su propia transacción antes
  de que se llame a este hook, así que si el descuento de inventario
  falla, el pedido queda persistido igual (en estado `pendiente`) sin
  haber descontado nada. No hay una transacción conjunta que cubra ambas
  operaciones.
- **Cancelar un pedido no reintegra inventario.** Ninguna transición de
  estado, incluida `cancelado`, vuelve a llamar a `inventarioServicio`.
  Si el módulo de inventario necesita reponer el stock al cancelar, es
  responsabilidad de quien lo construya añadir esa pieza aparte — este
  contrato no expone un hook tipo `reintegrarPorPedido`.
- **`items` no viene deduplicado por `platoId`.** Si un pedido tiene dos
  líneas con el mismo plato, `descontarPorPedido` recibe dos entradas
  separadas para ese plato, no una sola sumada.
- **`pedidosRepositorio` todavía no tiene forma de consultar por
  huésped.** No expone filtro por `huespedId` ni conteo de franjas ya
  consumidas en el día. Quien implemente
  `derechoDeComidasServicio.validarDerecho` va a necesitar agregar su
  propia manera de leer esos datos (un método nuevo en
  `pedidosRepositorio`, o un repositorio propio) para poder contar
  cuántas franjas distintas ya consumió hoy un huésped, tal como pide la
  regla de negocio.

`pedidosServicio` las llama tal cual y deja que sus errores propaguen sin
envolverlos ni reinterpretarlos — el `manejadorErrores` global ya sabe
manejar cualquier `ErrorDeNegocio`.

**Placeholder temporal** en `contenedor.js`:

```js
const derechoDeComidasServicioPlaceholder = {
  validarDerecho() {}, // permite todo — reemplazar cuando exista el modulo real
};
const inventarioServicioPlaceholder = {
  descontarPorPedido() {}, // no hace nada — reemplazar cuando exista el modulo real
};
```

Registrados con un comentario `// TODO(compañero): reemplazar con la
implementación real de derecho de comidas / inventario — misma interfaz,
solo cambiar este registro, pedidosServicio no cambia.` La otra persona
reemplaza únicamente este registro; `pedidosServicio` no se toca.

## Huéspedes — API (mínima)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/huespedes` | mesero, admin | crea; 409 `HUESPED_DUPLICADO` si el documento ya existe |
| GET | `/api/huespedes?documento=` | cualquier sesión | busca por documento exacto; 404 `HUESPED_NO_ENCONTRADO` si no existe |

### Esquema (`backend/src/esquemas/huespedesEsquemas.js`)

```js
esquemaCrearHuesped = z.object({
  documento: z.string().trim().min(1).max(30),
  nombreCompleto: nombrePersona, // reutiliza backend/src/esquemas/comunEsquemas.js
  telefono: telefono.optional(), // idem
  tipoHuesped: z.enum(['ordinario', 'ejecutivo', 'vip']),
}).strict();

esquemaBuscarHuespedPorDocumento = z.object({
  documento: z.string().trim().min(1).max(30),
}).strict(); // validación de req.query
```

### Repositorio (`backend/src/modelos/huespedesRepositorio.js`)

`crear({documento, nombreCompleto, telefono, tipoHuesped})`,
`buscarPorId(id)`, `buscarPorDocumento(documento)`.

### Servicio (`backend/src/servicios/huespedesServicio.js`)

`crearHuesped(...)` — 409 `HUESPED_DUPLICADO` si `buscarPorDocumento` ya
devuelve algo. `buscarHuespedPorDocumento(documento)` — 404
`HUESPED_NO_ENCONTRADO` si no existe.

## Pedidos — la máquina de estados

### Crear

`POST /api/pedidos` (rol `mesero`):

```js
{ huespedId: number, franja: 'desayuno'|'almuerzo'|'cena', items: [{ platoId: number, cantidad: number }] }
```

En una sola operación (esta es la "confirmación" — no hay estado
borrador):

1. Valida que el huésped exista (404 `HUESPED_NO_ENCONTRADO`).
2. Valida que `items` tenga al menos 1 elemento.
3. Para cada ítem: valida que el plato exista (404 `PLATO_NO_ENCONTRADO`)
   y esté `disponible` (409 `PLATO_NO_DISPONIBLE`).
4. Llama `derechoDeComidasServicio.validarDerecho({huespedId, franja})`.
5. Crea el pedido (`estado = 'pendiente'`, `usuarioId` = el mesero
   autenticado) y sus `items_pedido`, copiando `precioUnitario` de cada
   plato al momento de la creación.
6. Llama `inventarioServicio.descontarPorPedido({items})`.

201 con el pedido completo, items incluidos.

### Leer

- `GET /api/pedidos` (cualquier sesión) — filtros opcionales de query
  `?estado=` y `?franja=`, mismo patrón que el filtro de platos.
- `GET /api/pedidos/:id` (cualquier sesión) — detalle con items; 404
  `NO_ENCONTRADO` si no existe.

### Transición de estado

`PATCH /api/pedidos/:id/estado` — `{ estado: nuevoEstado }`. La ruta solo
exige sesión (`requiereSesion`, sin `requiereRol` fijo): el rol permitido
depende de cuál transición se pide, así que se valida dentro del
servicio, no en middleware de ruta.

| Transición | Rol permitido |
|---|---|
| `pendiente → en_preparacion` | cocina |
| `en_preparacion → listo` | cocina |
| `listo → entregado` | mesero |
| `pendiente → cancelado` | mesero o cocina |
| `en_preparacion → cancelado` | mesero o cocina |

Cualquier otro par `(estadoActual, nuevoEstado)` no listado arriba → 409
`TRANSICION_INVALIDA`. Transición presente en la tabla pero el rol del
usuario autenticado no está en la lista permitida para ella → 403
`NO_AUTORIZADO` (mismo código/status que usa `crearRequiereRol`, lanzado
desde el servicio en este caso). Ninguna transición dispara de nuevo
`derechoDeComidasServicio` ni `inventarioServicio` — esos dos hooks solo
se llaman una vez, al crear.

### Repositorio (`backend/src/modelos/pedidosRepositorio.js`)

`crear({huespedId, usuarioId, franja, items})` (inserta pedido +
items_pedido en una transacción `better-sqlite3`), `cambiarEstado({id,
estado})`, `buscarPorId(id)` (incluye items), `listar({estado, franja})`.

### Servicio (`backend/src/servicios/pedidosServicio.js`)

`crearPedido({huespedId, usuarioId, franja, items})`,
`cambiarEstadoPedido({id, nuevoEstado, rol})`, `obtenerPedidoPorId(id)`,
`listarPedidos({estado, franja})`.

## Manejo de errores

Códigos nuevos: `HUESPED_DUPLICADO` (409), `HUESPED_NO_ENCONTRADO` (404),
`PLATO_NO_DISPONIBLE` (409), `TRANSICION_INVALIDA` (409). Reutiliza
`PLATO_NO_ENCONTRADO` (ya definido en el módulo de platos) cuando un ítem
de pedido referencia un plato inexistente — mismo significado exacto.
`NO_AUTORIZADO` en transiciones usa el mismo código/status que
`crearRequiereRol`, solo que lanzado desde `pedidosServicio` en vez de
middleware.

## Testing

Mismo estilo `supertest` + `crearAppDePrueba` que los módulos anteriores.

**Huéspedes**: crear, 409 duplicado, 422 datos inválidos, buscar por
documento (200 y 404).

**Pedidos**: crear con éxito (201, precio copiado correctamente), 404
huésped inexistente, 404 plato inexistente, 409 plato no disponible, 422
items vacío, secuencia completa de transiciones
`pendiente→en_preparacion→listo→entregado` respetando el rol de cada
paso, 403 cuando un rol equivocado intenta una transición (p.ej. mesero
intentando `pendiente→en_preparacion`), cancelar desde `pendiente` y
desde `en_preparacion`, 409 `TRANSICION_INVALIDA` en un par no permitido
(p.ej. `listo→pendiente`), filtro de `GET /pedidos` por `estado` y por
`franja`.

El placeholder de `derechoDeComidasServicio`/`inventarioServicio`
registrado en el contenedor de pruebas permite todo, así que estos tests
verifican la máquina de estados y las validaciones propias de este
módulo — no las reglas de negocio de derecho de comidas ni inventario,
que la otra persona prueba en su propio módulo.

~16–18 tests entre huéspedes y pedidos.

## Cambios en archivos existentes

- `backend/src/contenedor.js`: registrar `huespedesRepositorio`,
  `pedidosRepositorio`, `huespedesServicio`, `pedidosServicio`, y los dos
  placeholders (`derechoDeComidasServicioPlaceholder`,
  `inventarioServicioPlaceholder`) con el comentario TODO para la otra
  persona.
- `backend/src/app.js`: montar `/api/huespedes` y `/api/pedidos`,
  reemplazando los comentarios de rutas pendientes ya presentes.
- `docs/decisiones.md`: marcar huéspedes + máquina de estados de comanda
  como hechas en el reparto de trabajo, y anotar explícitamente el
  contrato de los dos puntos de enganche para que la otra persona lo
  encuentre sin tener que leer el código.
