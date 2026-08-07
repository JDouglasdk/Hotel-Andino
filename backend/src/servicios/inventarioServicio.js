function crearInventarioServicio({ ingredientesServicio, conexion }) {
  return {
    descontarPorPedido({ items, usuarioId, pedidoId }) {
      const ejecutar = conexion.transaction(() => {
        for (const { platoId, cantidad } of items) {
          ingredientesServicio.descontarPorReceta(platoId, cantidad, { usuarioId, pedidoId });
        }
      });
      ejecutar();
    },
    restituirPorPedido({ pedidoId, usuarioId }) {
      ingredientesServicio.restituirConsumosDePedido({ pedidoId, usuarioId });
    },
  };
}

module.exports = { crearInventarioServicio };
