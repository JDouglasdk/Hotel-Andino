-- Platos incluidos en una comanda. `precio_unitario` se copia del plato al
-- momento del pedido (no se referencia en vivo) para que la caja diaria no
-- cambie retroactivamente si el precio de un plato se edita después.
CREATE TABLE items_pedido (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  plato_id INTEGER NOT NULL REFERENCES platos(id),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario INTEGER NOT NULL CHECK (precio_unitario >= 0)
);
