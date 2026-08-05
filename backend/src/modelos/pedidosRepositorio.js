function crearPedidosRepositorio(conexion) {
  const insertarPedido = conexion.prepare(`
    INSERT INTO pedidos (huesped_id, usuario_id, franja, estado, creado_en)
    VALUES (@huespedId, @usuarioId, @franja, 'pendiente', @creadoEn)
  `);
  const insertarItem = conexion.prepare(`
    INSERT INTO items_pedido (pedido_id, plato_id, cantidad, precio_unitario)
    VALUES (@pedidoId, @platoId, @cantidad, @precioUnitario)
  `);
  const cambiarEstadoStmt = conexion.prepare('UPDATE pedidos SET estado = @estado WHERE id = @id');
  const buscarPedidoPorIdStmt = conexion.prepare('SELECT * FROM pedidos WHERE id = ?');
  const buscarItemsPorPedidoStmt = conexion.prepare('SELECT * FROM items_pedido WHERE pedido_id = ?');
  const franjasConsumidasHoyStmt = conexion.prepare(`
    SELECT DISTINCT franja FROM pedidos
    WHERE huesped_id = @huespedId
      AND estado != 'cancelado'
      AND date(creado_en, '-5 hours') = date('now', '-5 hours')
  `);
  const listarEntregadosHoyStmt = conexion.prepare(`
    SELECT * FROM pedidos
    WHERE estado = 'entregado'
      AND date(creado_en, '-5 hours') = date('now', '-5 hours')
  `);

  function itemADominio(fila) {
    return {
      id: fila.id,
      platoId: fila.plato_id,
      cantidad: fila.cantidad,
      precioUnitario: fila.precio_unitario,
    };
  }

  function pedidoADominio(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      huespedId: fila.huesped_id,
      usuarioId: fila.usuario_id,
      franja: fila.franja,
      estado: fila.estado,
      creadoEn: fila.creado_en,
      items: buscarItemsPorPedidoStmt.all(fila.id).map(itemADominio),
    };
  }

  function obtenerPorId(id) {
    return pedidoADominio(buscarPedidoPorIdStmt.get(id));
  }

  const crearConItems = conexion.transaction(({ huespedId, usuarioId, franja, items }) => {
    const creadoEn = new Date().toISOString();
    const resultado = insertarPedido.run({ huespedId, usuarioId, franja, creadoEn });
    const pedidoId = resultado.lastInsertRowid;
    for (const item of items) {
      insertarItem.run({ pedidoId, platoId: item.platoId, cantidad: item.cantidad, precioUnitario: item.precioUnitario });
    }
    return pedidoId;
  });

  return {
    crear({ huespedId, usuarioId, franja, items }) {
      const pedidoId = crearConItems({ huespedId, usuarioId, franja, items });
      return obtenerPorId(pedidoId);
    },
    cambiarEstado({ id, estado }) {
      cambiarEstadoStmt.run({ id, estado });
      return obtenerPorId(id);
    },
    buscarPorId(id) {
      return obtenerPorId(id);
    },
    listar({ estado, franja } = {}) {
      const condiciones = [];
      const valores = {};
      if (estado !== undefined) {
        condiciones.push('estado = @estado');
        valores.estado = estado;
      }
      if (franja !== undefined) {
        condiciones.push('franja = @franja');
        valores.franja = franja;
      }
      const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
      const filas = conexion.prepare(`SELECT * FROM pedidos ${where} ORDER BY creado_en, id`).all(valores);
      return filas.map(pedidoADominio);
    },
    franjasConsumidasHoy(huespedId) {
      return franjasConsumidasHoyStmt.all({ huespedId }).map((fila) => fila.franja);
    },
    listarEntregadosHoy() {
      return listarEntregadosHoyStmt.all().map(pedidoADominio);
    },
  };
}

module.exports = { crearPedidosRepositorio };
