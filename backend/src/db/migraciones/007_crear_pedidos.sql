-- Comanda. `franja` existe por dos razones: (1) reportar platos servidos
-- por desayuno/almuerzo/cena, pedido explícito de la ficha técnica; y
-- (2) validar el derecho de comidas del huésped contando franjas DISTINTAS
-- ya consumidas hoy (no se guarda un contador aparte en `huespedes` para
-- evitar que se desincronice del historial real de pedidos).
CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  huesped_id INTEGER NOT NULL REFERENCES huespedes(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  franja TEXT NOT NULL CHECK (franja IN ('desayuno','almuerzo','cena')),
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','en_preparacion','listo','entregado','cancelado')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
