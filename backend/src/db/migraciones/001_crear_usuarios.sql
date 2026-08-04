-- Personal del hotel con acceso al sistema (login). No incluye huéspedes:
-- ellos no inician sesión, se gestionan en la tabla `huespedes` (migración 002).
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_completo TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  contrasena_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin','mesero','cocina','jefeDeCaja')),
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
