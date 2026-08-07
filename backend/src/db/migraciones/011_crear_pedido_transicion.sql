-- Bitacora de cambios de estado de un pedido. No registra la creacion
-- (ese momento ya lo captura pedidos.creado_en + pedidos.usuario_id) —
-- solo transiciones reales via pedidosServicio.cambiarEstadoPedido.
-- Auditoria interna: sin endpoint ni vista, solo consultable por tests
-- o acceso directo a BD. Exponerla es una decision funcional aparte.
CREATE TABLE pedido_transicion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  estado_anterior TEXT NOT NULL,
  estado_nuevo TEXT NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_pedido_transicion_pedido ON pedido_transicion(pedido_id);
