function crearPedidoTransicionRepositorio(conexion) {
  const insertar = conexion.prepare(`
    INSERT INTO pedido_transicion (pedido_id, estado_anterior, estado_nuevo, usuario_id, creado_en)
    VALUES (@pedidoId, @estadoAnterior, @estadoNuevo, @usuarioId, @creadoEn)
  `);
  const obtenerPorIdStmt = conexion.prepare('SELECT * FROM pedido_transicion WHERE id = ?');
  const listarPorPedidoStmt = conexion.prepare(
    'SELECT * FROM pedido_transicion WHERE pedido_id = ? ORDER BY creado_en, id'
  );

  function aDominio(fila) {
    return {
      id: fila.id,
      pedidoId: fila.pedido_id,
      estadoAnterior: fila.estado_anterior,
      estadoNuevo: fila.estado_nuevo,
      usuarioId: fila.usuario_id,
      creadoEn: fila.creado_en,
    };
  }

  return {
    registrar({ pedidoId, estadoAnterior, estadoNuevo, usuarioId }) {
      const creadoEn = new Date().toISOString();
      const resultado = insertar.run({ pedidoId, estadoAnterior, estadoNuevo, usuarioId, creadoEn });
      return aDominio(obtenerPorIdStmt.get(resultado.lastInsertRowid));
    },
    // Solo para tests/verificación interna — ninguna ruta HTTP expone esto.
    listarPorPedido(pedidoId) {
      return listarPorPedidoStmt.all(pedidoId).map(aDominio);
    },
  };
}

module.exports = { crearPedidoTransicionRepositorio };
