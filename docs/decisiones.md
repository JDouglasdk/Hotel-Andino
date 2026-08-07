# Decisiones del proyecto — resumen para el equipo

Este documento existe porque solo una persona del equipo participó en el
análisis inicial. Si no leíste esa conversación, esto te pone al día sin
tener que repetirla.

## El reto (resumen de `doc-hotelApp.docx`)

Hotel Andino S.A.S., restaurante que atiende huéspedes y clientes externos.
Problema: sin trazabilidad de platos servidos, sin caja en tiempo real
ligada a inventario, sin validación automática de cuántas comidas diarias
tiene derecho a consumir cada huésped.

**Nota**: el documento original mezcla, en varias secciones (atributos de
la solución, criterios de evaluación, restricciones), texto de otro reto
distinto sobre "gestión de salones y cursos académicos". Es contaminación
de plantilla — se descartó, no aplica a este proyecto.

## Alcance decidido (MVP de 12h, incluye exposición)

### Núcleo — innegociable

1. Login por rol (admin, mesero, cocina, jefeDeCaja) — sesión de servidor.
2. Huésped con `tipo_huesped` (ordinario/ejecutivo/vip).
3. Menú: categorías + platos.
4. Comanda: mesero registra pedido para un huésped. Estados
   `pendiente → en_preparacion → listo → entregado` (+ `cancelado`).
5. **Validación de derecho de comidas al crear la comanda** — regla:
   ordinario=1 comida/día, ejecutivo=2, vip=3. Se cuentan franjas
   (desayuno/almuerzo/cena) distintas ya consumidas hoy por ese huésped,
   no un contador aparte. Esta es la pieza central del reto, la de mayor
   riesgo y la que más hay que probar.
6. Descuento automático de inventario al confirmar comanda, según receta
   (`plato_ingrediente`).
7. Caja diaria: suma de comandas entregadas del día.
8. Seguridad base no negociable (ver más abajo) — la evaluación incluye
   pruebas contra ataques.

### Recortable en este orden si falta tiempo

1. ~~Historial detallado de movimientos de inventario (bitácora completa).~~ Completo.
2. Reporte de platos servidos desglosado por franja (arrancar con total
   simple).
3. Cancelación de comandas como flujo completo (un estado simple basta).
4. CRUD administrativo amplio — arrancar con datos semilla + alta mínima.
5. Cualquier pulido visual.

### Fuera de alcance (confirmado, no construir)

- Clientes externos al hotel (solo huéspedes).
- Ingresos/egresos de caja que no vengan de venta de platos.

## Stack decidido — y por qué

Reciclado de `restaurante-app` (proyecto hermano, mismo tipo de problema
en capas ya resuelto y probado con 192+244 tests) en vez de empezar de
cero, por el tiempo disponible:

- **Node.js + Express** — backend, capas `rutas → controladores →
  servicios → modelos (repositorios)`, contenedor de inyección de
  dependencias (`src/contenedor.js`).
- **SQLite** (`better-sqlite3`) — cero setup de servidor de BD, migraciones
  SQL versionadas en `src/db/migraciones/`.
- **HTML/CSS/JS vanilla**, servido estático desde el mismo Express. Regla
  dura: cero HTML embebido en JS (nada de `innerHTML` con marcado armado ni
  template strings con etiquetas — usar `createElement`/`textContent`).
- **Sesión de servidor** (`express-session` + `connect-sqlite3`), cookie
  `httpOnly`/`sameSite=strict` — nunca token en `localStorage`.
- **bcryptjs** para contraseñas, **zod** para validación de entrada,
  **helmet** + **express-rate-limit** como higiene base.
- **`node --test`** (nativo) + `supertest` (backend) + `jsdom` (frontend).

**Despliegue**: local o red del sitio del hackathon — no hay decisión de
desplegar a internet público. La mecánica exacta de las "pruebas contra
ataques" no la va a dar el instructor antes de la exposición, así que el
diseño asume higiene de seguridad no negociable independientemente de
cómo se ejecuten esas pruebas.

## Seguridad no negociable (pesa en la nota)

- Contraseñas con `bcrypt`, nunca texto plano.
- Validación de entrada en el servidor con `zod` — nunca confiar solo en
  el frontend.
- Queries siempre parametrizadas (`conexion.prepare(...).run(valores)`),
  nunca concatenar SQL con datos de entrada.
- Cookie de sesión `httpOnly` + `sameSite=strict`.
- Autenticación (¿quién eres?) y autorización (¿qué puedes hacer?) como
  cosas separadas — `crearRequiereSesion` vs `crearRequiereRol` en
  `src/middlewares/autenticacion.js`.
- Sin credenciales ni secretos en el repositorio — todo vía `.env`
  (`.env` está en `.gitignore`, solo se versiona `.env.example`).

## Reparto de trabajo — estado final

El núcleo completo del reto (ítems 1-8 de "Alcance decidido" arriba) está
construido y probado en `main`: autenticación/usuarios, menú
(categorías/platos), huéspedes, la máquina de estados de comanda,
ingredientes/recetas, validación real de derecho de comidas, descuento de
inventario y caja diaria — 77 tests de integración en verde. Ver
`backend/src/{modelos,servicios,controladores,rutas}` y
`backend/tests/integracion/`.

**Nota sobre la rama `feature/derecho-comidas-inventario`**: la otra
persona del equipo entregó esa parte del ticket, pero como una reescritura
casi completa del backend (no solo derecho de comidas/inventario/caja) —
partió aparentemente de una copia del proyecto anterior a que se
fusionaran menú/huéspedes/pedidos, con 39 de sus 77 tests fallando contra
su propio código, sin el rate limiting de login (marcado no negociable
arriba), sin el endpoint de disponibilidad de platos, y sin el permiso
granular por transición de la máquina de estados. Se decidió **no
fusionar esa rama**. Se rescató la lógica de negocio genuinamente nueva y
correcta que contenía (`ingredientesServicio`, `ingredientesRepositorio`,
`recetasRepositorio`, y la regla de derecho de comidas) y se reimplementó
sobre `main`, siguiendo las convenciones ya establecidas — ver
`docs/superpowers/specs/2026-08-04-inventario-derecho-comidas-reportes-design.md`
(local, no versionado) para el detalle completo de esa decisión.

Límite de inventario descontado al confirmar comanda: `descontarPorPedido`
corre en una sola transacción sobre todos los ítems del pedido, pero
**después** de que `pedidosRepositorio.crear` ya hizo commit del pedido —
si el descuento falla (stock insuficiente), el pedido queda persistido en
`pendiente` sin inventario descontado. Comportamiento conocido, no
resuelto en este plan.

Cancelar un pedido tampoco reintegra el inventario que ya se descontó al
crearlo — ninguna transición de estado, incluida `cancelado`, vuelve a
llamar a `inventarioServicio`. Combinado con lo anterior: un pedido cuyo
descuento de inventario falla (stock insuficiente) sigue contando contra
el límite diario de comidas del huésped, aunque nunca se haya podido
preparar — cancelarlo libera esa franja otra vez, pero hay que hacerlo a
mano. Un ciclo crear-y-cancelar, por su parte, drena inventario sin dejar
rastro de consumo real. Comportamiento conocido, no resuelto en este
plan.

Trabajar en ramas separadas, fusionar seguido para evitar choques.

## Supuestos marcados (confirmar si algo cambia)

- Moneda sin decimales (COP) — precios como `INTEGER`. Si no aplica,
  cambiar las columnas `precio`/`precio_unitario` a `REAL` antes de
  sembrar datos.
- El diagrama original (`Diagrama hotel.drawio`) es un borrador
  incompleto — el esquema real quedó definido en las migraciones de
  `backend/src/db/migraciones/`, no en el diagrama.
- `huespedes` es una tabla separada de `usuarios`: los huéspedes no tienen
  login, se identifican por documento al tomar la comanda. El diagrama
  original los modelaba como un caso de `Usuario`/`Rol` — se cambió a
  propósito porque el huésped no necesita autenticarse.

## Pendiente de confirmar (no bloquea empezar a construir)

- Mecánica exacta de las pruebas contra ataques (misma red/sala vs.
  acceso remoto) — el instructor lo dirá después de la exposición.
