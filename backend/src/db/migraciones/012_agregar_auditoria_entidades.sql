-- Columnas de auditoria uniforme (quien creo/edito una fila, y cuando).
-- Todas nullable: las filas ya existentes (seed de admin, datos previos)
-- no tienen un actor real que rellenar retroactivamente — nunca se
-- inventa un "usuario sistema". Cada tabla recibe solo lo que tiene un
-- caso de uso real hoy (ver docs/superpowers/specs/2026-08-07-transiciones-y-auditoria-design.md):
--   - usuarios/categorias/platos: tienen editar -> creado_por + actualizado_por/en.
--   - huespedes: solo crear (no hay editar) -> solo creado_por.
--   - ingredientes: solo crear -> creado_por + creado_en (esta ultima no
--     existia). Sin actualizado_por/en nuevo — el actualizado_en que ya
--     existe lo sigue moviendo cada movimiento de stock, sin relacion
--     con esta migracion.
ALTER TABLE usuarios    ADD COLUMN creado_por INTEGER REFERENCES usuarios(id);
ALTER TABLE usuarios    ADD COLUMN actualizado_por INTEGER REFERENCES usuarios(id);
ALTER TABLE usuarios    ADD COLUMN actualizado_en TEXT;

ALTER TABLE categorias  ADD COLUMN creado_por INTEGER REFERENCES usuarios(id);
ALTER TABLE categorias  ADD COLUMN actualizado_por INTEGER REFERENCES usuarios(id);
ALTER TABLE categorias  ADD COLUMN creado_en TEXT;
ALTER TABLE categorias  ADD COLUMN actualizado_en TEXT;

ALTER TABLE platos      ADD COLUMN creado_por INTEGER REFERENCES usuarios(id);
ALTER TABLE platos      ADD COLUMN actualizado_por INTEGER REFERENCES usuarios(id);
ALTER TABLE platos      ADD COLUMN actualizado_en TEXT;

ALTER TABLE huespedes    ADD COLUMN creado_por INTEGER REFERENCES usuarios(id);

ALTER TABLE ingredientes ADD COLUMN creado_por INTEGER REFERENCES usuarios(id);
ALTER TABLE ingredientes ADD COLUMN creado_en TEXT;
