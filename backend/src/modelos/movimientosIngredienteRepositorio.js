function crearMovimientosIngredienteRepositorio(conexion) {
  const insertar = conexion.prepare(`
    INSERT INTO movimiento_ingrediente
      (ingrediente_id, delta, motivo, usuario_id, pedido_id, movimiento_origen_id, cantidad_resultante, creado_en)
    VALUES
      (@ingredienteId, @delta, @motivo, @usuarioId, @pedidoId, @movimientoOrigenId, @cantidadResultante, @creadoEn)
  `);
  const obtenerPorIdStmt = conexion.prepare('SELECT * FROM movimiento_ingrediente WHERE id = ?');
  const listarPorIngredienteStmt = conexion.prepare(`
    SELECT m.*, u.nombre_completo AS usuario_nombre
    FROM movimiento_ingrediente m
    JOIN usuarios u ON u.id = m.usuario_id
    WHERE m.ingrediente_id = ?
    ORDER BY m.creado_en DESC, m.id DESC
  `);
  const listarPorPedidoYMotivoStmt = conexion.prepare(
    'SELECT * FROM movimiento_ingrediente WHERE pedido_id = ? AND motivo = ?'
  );

  function aDominio(fila) {
    return {
      id: fila.id,
      ingredienteId: fila.ingrediente_id,
      delta: fila.delta,
      motivo: fila.motivo,
      usuarioId: fila.usuario_id,
      pedidoId: fila.pedido_id,
      movimientoOrigenId: fila.movimiento_origen_id,
      cantidadResultante: fila.cantidad_resultante,
      creadoEn: fila.creado_en,
    };
  }

  return {
    registrar({ ingredienteId, delta, motivo, usuarioId, pedidoId = null, movimientoOrigenId = null, cantidadResultante }) {
      const creadoEn = new Date().toISOString();
      const resultado = insertar.run({ ingredienteId, delta, motivo, usuarioId, pedidoId, movimientoOrigenId, cantidadResultante, creadoEn });
      return aDominio(obtenerPorIdStmt.get(resultado.lastInsertRowid));
    },
    listarPorIngrediente(ingredienteId) {
      return listarPorIngredienteStmt.all(ingredienteId)
        .map((fila) => Object.assign(aDominio(fila), { usuarioNombre: fila.usuario_nombre }));
    },
    listarPorPedido(pedidoId, motivo) {
      return listarPorPedidoYMotivoStmt.all(pedidoId, motivo).map(aDominio);
    },
  };
}

module.exports = { crearMovimientosIngredienteRepositorio };
