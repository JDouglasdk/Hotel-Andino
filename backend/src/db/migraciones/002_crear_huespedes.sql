-- Huéspedes registrados. No tienen credenciales de acceso: el mesero los
-- identifica por documento al registrar una comanda.
--
-- `tipo_huesped` determina cuántas comidas diarias tiene derecho a consumir
-- (regla confirmada de negocio: ordinario=1, ejecutivo=2, vip=3). El número
-- de comidas NO se guarda como columna aquí a propósito — se deriva en la
-- capa de servicio a partir de este tipo, para tener una sola fuente de
-- verdad. Si mañana la regla cambia, se cambia en un solo lugar.
CREATE TABLE huespedes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  documento TEXT NOT NULL UNIQUE,
  nombre_completo TEXT NOT NULL,
  telefono TEXT,
  tipo_huesped TEXT NOT NULL CHECK (tipo_huesped IN ('ordinario','ejecutivo','vip')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
