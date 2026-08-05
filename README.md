# Hotel Andino — Restaurante

Sistema para el área de alimentos y bebidas del Hotel Andino: valida el
derecho de comidas diarias de cada huésped según su tipo de reserva,
registra comandas con descuento automático de inventario, y calcula el
flujo de caja diario.

Reto de formación (SENA) — ver `doc-hotelApp.docx` (ficha técnica original)
y `docs/decisiones.md` (alcance, stack y reparto de trabajo ya decididos).

Backend REST en Node.js/Express + SQLite (`better-sqlite3`), frontend en
HTML/CSS/JS puro sin framework, servidos desde la misma app Express —
mismo patrón que `restaurante-app`, reciclado donde aplica.

## Estado actual

Núcleo completo del reto construido y probado: cimientos + módulo de
autenticación/usuarios, módulo de menú (categorías/platos), módulo de
huéspedes, la máquina de estados de comanda (pedidos: crear con
validación de huésped/plato/disponibilidad, transición de estado por rol,
cancelación), ingredientes/recetas, validación real de derecho de
comidas, descuento automático de inventario y caja diaria — 78 tests de
integración en verde.

**Frontend completo**: login funcional, guarda de sesión por rol y
header persistente en los 4 paneles, cada uno con su lógica de negocio
real (no placeholder):

- **Mesero**: identifica huésped por documento, registra comanda por
  franja con validación real de derecho de comidas.
- **Cocina**: cola de comandas (`pendiente`/`en_preparacion`) con
  transición de estado y cancelación confirmada.
- **Jefe de caja**: caja del día, platos servidos por franja e
  inventario (solo lectura).
- **Admin**: usuarios, alta de huéspedes, menú (categorías/platos) e
  ingredientes (con actualización de stock).

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

Mismo formato en ambos (`node --test`). Backend: 78 tests de integración
en verde (auth/usuarios, menú, huéspedes, pedidos, ingredientes/recetas,
derecho de comidas, inventario, caja diaria). Frontend: 95 tests
unitarios en verde (`node --test` + `jsdom`) — cimientos compartidos
(dialogo.js, clienteApi.js, sesion.js, header.js, panel.js), login, y
los 4 paneles de rol con su lógica de negocio.
