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

Cimientos + módulo de autenticación/usuarios, módulo de menú
(categorías/platos), módulo de huéspedes y la máquina de estados de
comanda (pedidos: crear con validación de huésped/plato/disponibilidad,
transición de estado por rol, cancelación) completos y probados —
55 tests de integración en verde. `pedidosServicio` ya deja el enganche
listo para las dos piezas que faltan (validación de derecho de comidas y
descuento de inventario), vía un placeholder en `contenedor.js` que se
reemplaza sin tocar el resto del código.

**Todavía no existe**: validación de derecho de comidas, descuento
automático de inventario y caja diaria — son de la otra persona del
equipo. Tampoco hay frontend funcional (las páginas por rol siguen siendo
placeholder). Ver `docs/decisiones.md` para el reparto completo y
`docs/superpowers/specs/2026-08-04-maquina-estados-comanda-design.md`
para el contrato exacto de los puntos de enganche.

## Cómo arrancar

```bash
cd backend
npm install
cp .env.example .env
npm run migrar
npm start
```

Sirve en `http://localhost:3000`. Rutas de página: `/login`, `/admin`,
`/mesero`, `/cocina`, `/jefeDeCaja`. Ninguna tiene funcionalidad real aún —
son placeholders.

Admin de desarrollo sembrado por migración: `admin@hotelandino.com` /
`Admin123!` — cambiar antes de cualquier uso fuera de desarrollo.

## Tests

```bash
cd backend && npm test
cd frontend && npm test
```

Mismo formato en ambos (`node --test`). Backend: 55 tests de integración
en verde (auth/usuarios, menú, huéspedes, pedidos). Frontend: sin tests
propios todavía — no hay funcionalidad real que probar hasta que se
construya la interfaz.
