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

Cimientos + módulo de autenticación/usuarios y módulo de menú
(categorías/platos, CRUD restringido a admin) completos y probados (login,
sesión, rate limiting en login, CRUD de usuarios restringido a admin,
33 tests de integración en verde). **El resto de la lógica de negocio
(huéspedes, comandas, inventario, caja) todavía no existe** — son
solo páginas placeholder por rol. Ver `docs/decisiones.md` para qué falta
y quién lo construye.

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

Ambos corren, mismo formato (`node --test`), sin ningún test propio
todavía — se agregan junto con cada módulo de lógica de negocio.
