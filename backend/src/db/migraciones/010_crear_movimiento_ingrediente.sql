-- Bitacora de movimientos de inventario. `ingredientes.cantidad_stock`
-- sigue siendo el valor cacheado; esta tabla es su historial inmutable —
-- un error se corrige con un movimiento nuevo (motivo 'ajuste'), nunca
-- editando uno pasado.
--
-- `delta` positivo entra stock, negativo sale. `pedido_id` solo se llena en
-- consumo_comanda/restitucion_cancelacion: es la clave que permite revertir
-- exactamente lo que un pedido consumio sin depender de la receta actual
-- (que puede haber cambiado desde que se creo el pedido — la bitacora es un
-- hecho historico, la receta es configuracion mutable). `movimiento_origen_id`
-- solo se llena en restitucion_cancelacion, apunta al consumo_comanda que
-- revierte (navegable sin inferir por pedido_id+ingrediente_id, que podria
-- ser ambiguo si un pedido consume el mismo ingrediente en platos distintos).
CREATE TABLE movimiento_ingrediente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id),
  delta REAL NOT NULL CHECK (delta != 0),
  motivo TEXT NOT NULL CHECK (motivo IN (
    'consumo_comanda', 'restitucion_cancelacion',
    'compra', 'merma', 'ajuste'
  )),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  pedido_id INTEGER REFERENCES pedidos(id),
  movimiento_origen_id INTEGER REFERENCES movimiento_ingrediente(id),
  cantidad_resultante REAL NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_movimiento_ingrediente_ingrediente ON movimiento_ingrediente(ingrediente_id);
CREATE INDEX idx_movimiento_ingrediente_pedido ON movimiento_ingrediente(pedido_id);
