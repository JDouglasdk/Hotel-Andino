# Hotel Andino — Restaurante

Sistema para el área de alimentos y bebidas del Hotel Andino: valida el
derecho de comidas diarias de cada huésped según su tipo de reserva,
registra comandas con descuento automático de inventario, y calcula el
flujo de caja diario.

Backend REST en Node.js/Express + SQLite (`better-sqlite3`), frontend en
HTML/CSS/JS puro sin framework, servidos desde la misma app Express —
mismo patrón que `restaurante-app`, reciclado donde aplica.

## Estado actual

Núcleo completo del reto construido y probado: cimientos + módulo de
autenticación/usuarios, módulo de menú (categorías/platos), módulo de
huéspedes, la máquina de estados de comanda (pedidos: crear con
validación de huésped/plato/disponibilidad, transición de estado por rol,
cancelación), ingredientes/recetas, validación real de derecho de
comidas, descuento automático de inventario y caja diaria — 104 tests de
integración en verde.

Sobre ese núcleo, tres piezas de auditoría/trazabilidad:

- **Bitácora de movimientos de inventario** (`movimiento_ingrediente`):
  reemplaza el ajuste absoluto de stock por un registro histórico con
  motivo/usuario/fecha, y la usa para restituir el stock exacto cuando se
  cancela un pedido (calculado desde lo que el pedido realmente consumió,
  no desde la receta actual).
- **Log de transiciones de pedido** (`pedido_transicion`): cada cambio de
  estado de una comanda queda registrado (quién, cuándo, de qué estado a
  cuál), atómicamente junto al cambio. Auditoría interna, sin endpoint ni
  vista todavía.
- **Auditoría uniforme de entidades**: `usuarios`, `categorías`, `platos`,
  `huéspedes` e `ingredientes` registran `creado_por`/`actualizado_por`
  (donde aplica) — quién creó o editó cada fila.

**Frontend completo**: login funcional, guarda de sesión por rol y
header persistente en los 4 paneles, cada uno con su lógica de negocio
real (no placeholder):

- **Mesero**: identifica huésped por documento, registra comanda por
  franja con validación real de derecho de comidas, y marca como
  entregados los pedidos que cocina dejó listos.
- **Cocina**: cola de comandas (`pendiente`/`en_preparacion`) con
  transición de estado y cancelación confirmada.
- **Jefe de caja**: caja del día, platos servidos por franja e
  inventario (solo lectura).
- **Admin**: usuarios, alta de huéspedes, menú (categorías/platos) e
  ingredientes (registrar movimientos de stock con motivo + historial).

Ver `docs/decisiones.md` para el reparto completo.

## Cómo arrancar

```bash
cd backend
npm install
cp .env.example .env
npm run migrar
npm start
```

Sirve en `http://localhost:3000`. Rutas de página: `/login`, `/admin`,
`/mesero`, `/cocina`, `/jefeDeCaja` — las 5 son funcionales de punta a
punta.

Admin de desarrollo sembrado por migración: `admin@hotelandino.com` /
`Admin123!` — cambiar antes de cualquier uso fuera de desarrollo.

## Tests

```bash
cd backend && npm test
cd frontend && npm test
```

Mismo formato en ambos (`node --test`). Backend: 104 tests de
integración en verde (auth/usuarios, menú, huéspedes, pedidos,
ingredientes/recetas, derecho de comidas, inventario, caja diaria,
bitácora de movimientos, transiciones de pedido, auditoría de
entidades). Frontend: 108 tests unitarios en verde (`node --test` +
`jsdom`) — cimientos compartidos (dialogo.js, clienteApi.js, sesion.js,
header.js, panel.js), login, y los 4 paneles de rol con su lógica de
negocio.

## Próximos pasos

Backlog priorizado de ideas de repos de referencia, pendientes de que se
confirme expandir alcance: UI de tarjetas de comanda con cronómetro para
cocina, resumen jerárquico visual del cierre de caja, dashboard
financiero (flujo de caja, utilidad, top gastos). A considerar (piden
aprobación explícita antes de construir): caja como sesión/turno con
apertura y cierre, tiempo real vía sockets, contabilidad de partida
doble.
