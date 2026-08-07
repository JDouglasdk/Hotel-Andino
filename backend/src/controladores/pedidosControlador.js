function crearPedidosControlador({ pedidosServicio }) {
  return {
    crear(req, res) {
      const pedido = pedidosServicio.crearPedido({
        huespedId: req.body.huespedId,
        usuarioId: req.usuario.id,
        franja: req.body.franja,
        items: req.body.items,
      });
      res.status(201).json(pedido);
    },
    listar(req, res) {
      const { estado, franja } = req.query;
      res.json(pedidosServicio.listarPedidos({ estado, franja }));
    },
    obtenerPorId(req, res) {
      res.json(pedidosServicio.obtenerPedidoPorId(Number(req.params.id)));
    },
    cambiarEstado(req, res) {
      const pedido = pedidosServicio.cambiarEstadoPedido({
        id: Number(req.params.id),
        nuevoEstado: req.body.estado,
        rol: req.usuario.rol,
        usuarioId: req.usuario.id,
      });
      res.json(pedido);
    },
  };
}

module.exports = { crearPedidosControlador };
