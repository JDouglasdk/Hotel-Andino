-- Stock de productos base. `cantidad_stock` se descuenta automáticamente al
-- confirmar una comanda, según la receta definida en `plato_ingrediente`
-- (migración 006). El CHECK >= 0 es una red de seguridad mínima: la regla
-- real de "no permitir vender sin stock suficiente" se valida en servicio,
-- antes de llegar a este UPDATE, para poder devolver un error claro.
CREATE TABLE ingredientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  cantidad_stock REAL NOT NULL DEFAULT 0 CHECK (cantidad_stock >= 0),
  unidad_medida TEXT NOT NULL,
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
