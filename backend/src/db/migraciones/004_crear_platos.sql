-- `precio` como entero asume pesos colombianos sin decimales (COP no usa
-- centavos en operación normal). Si el equipo maneja otra moneda, cambiar
-- a REAL antes de sembrar datos — es una suposición marcada, no un hecho
-- verificado con el equipo.
CREATE TABLE platos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  nombre TEXT NOT NULL,
  precio INTEGER NOT NULL CHECK (precio >= 0),
  informacion TEXT,
  disponible INTEGER NOT NULL DEFAULT 1 CHECK (disponible IN (0,1)),
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
