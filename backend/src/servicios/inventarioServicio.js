function crearInventarioServicio({ ingredientesServicio, conexion }) {
  return {
    descontarPorPedido({ items }) {
      const ejecutar = conexion.transaction(() => {
        for (const { platoId, cantidad } of items) {
          ingredientesServicio.descontarPorReceta(platoId, cantidad);
        }
      });
      ejecutar();
    },
  };
}

module.exports = { crearInventarioServicio };
