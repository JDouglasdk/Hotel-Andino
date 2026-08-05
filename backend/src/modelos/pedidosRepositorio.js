function crearPedidosRepositorio(conexion) {
  function obtenerPorId(id) {
    return conexion.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
  }

  function crear({ huespedId, usuarioId, franja }) {
    const resultado = conexion
      .prepare(
        `INSERT INTO pedidos (huesped_id, usuario_id, franja)
         VALUES (?, ?, ?)`
      )
      .run(huespedId, usuarioId, franja);
    return obtenerPorId(resultado.lastInsertRowid);
  }

  function agregarItem({ pedidoId, platoId, cantidad, precioUnitario }) {
    conexion
      .prepare(
        `INSERT INTO items_pedido (pedido_id, plato_id, cantidad, precio_unitario)
         VALUES (?, ?, ?, ?)`
      )
      .run(pedidoId, platoId, cantidad, precioUnitario);
  }

  function listarItemsPorPedido(pedidoId) {
    return conexion.prepare('SELECT * FROM items_pedido WHERE pedido_id = ?').all(pedidoId);
  }

  function actualizarEstado(id, estado) {
    conexion.prepare('UPDATE pedidos SET estado = ? WHERE id = ?').run(estado, id);
  }

  // Franjas distintas ya consumidas HOY por un huésped, sin contar comandas
  // canceladas — es la base de la validación de derecho de comidas (ver
  // migración 007). Devuelve un arreglo de strings, ej. ['desayuno'].
  function franjasConsumidasHoy(huespedId) {
    const filas = conexion
      .prepare(
        `SELECT DISTINCT franja FROM pedidos
         WHERE huesped_id = ? AND estado != 'cancelado' AND date(creado_en) = date('now')`
      )
      .all(huespedId);
    return filas.map((fila) => fila.franja);
  }

  function listarTodos() {
    return conexion.prepare('SELECT * FROM pedidos ORDER BY creado_en DESC').all();
  }

  // Total de la caja diaria: suma de items de comandas entregadas hoy.
  function totalEntregadoHoy() {
    const fila = conexion
      .prepare(
        `SELECT COALESCE(SUM(ip.cantidad * ip.precio_unitario), 0) AS total
         FROM items_pedido ip
         JOIN pedidos p ON p.id = ip.pedido_id
         WHERE p.estado = 'entregado' AND date(p.creado_en) = date('now')`
      )
      .get();
    return fila.total;
  }

  // Platos servidos hoy agrupados por franja (desayuno/almuerzo/cena),
  // pedido explícito de la ficha técnica. Solo cuenta comandas `entregado`
  // (mismo criterio que la caja diaria) — un pedido pendiente o cancelado
  // no fue realmente "servido". Franjas sin ventas no aparecen en el
  // resultado; el servicio se encarga de completarlas en 0.
  function platosServidosPorFranjaHoy() {
    return conexion
      .prepare(
        `SELECT p.franja AS franja, COALESCE(SUM(ip.cantidad), 0) AS cantidad
         FROM items_pedido ip
         JOIN pedidos p ON p.id = ip.pedido_id
         WHERE p.estado = 'entregado' AND date(p.creado_en) = date('now')
         GROUP BY p.franja`
      )
      .all();
  }

  return {
    obtenerPorId,
    crear,
    agregarItem,
    listarItemsPorPedido,
    actualizarEstado,
    franjasConsumidasHoy,
    listarTodos,
    totalEntregadoHoy,
    platosServidosPorFranjaHoy,
  };
}

module.exports = { crearPedidosRepositorio };
