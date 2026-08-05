function crearReportesServicio({ pedidosRepositorio }) {
  function cajaDelDia() {
    const pedidos = pedidosRepositorio.listarEntregadosHoy();
    const total = pedidos.reduce(
      (acc, pedido) => acc + pedido.items.reduce((sub, item) => sub + item.precioUnitario * item.cantidad, 0),
      0
    );
    return { total, cantidadPedidos: pedidos.length };
  }

  function platosServidosPorFranja() {
    const pedidos = pedidosRepositorio.listarEntregadosHoy();
    const conteo = {};
    for (const pedido of pedidos) {
      conteo[pedido.franja] = conteo[pedido.franja] || {};
      for (const item of pedido.items) {
        conteo[pedido.franja][item.platoId] = (conteo[pedido.franja][item.platoId] || 0) + item.cantidad;
      }
    }
    return conteo;
  }

  return { cajaDelDia, platosServidosPorFranja };
}

module.exports = { crearReportesServicio };
