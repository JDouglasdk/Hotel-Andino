function crearIngredientesControlador({ ingredientesServicio }) {
  return {
    listar(req, res) {
      res.json(ingredientesServicio.listarIngredientes());
    },
    crear(req, res) {
      const ingrediente = ingredientesServicio.crearIngrediente({
        nombre: req.body.nombre,
        cantidadStock: req.body.cantidadStock,
        unidadMedida: req.body.unidadMedida,
      });
      res.status(201).json(ingrediente);
    },
    actualizarStock(req, res) {
      const ingrediente = ingredientesServicio.actualizarStock({
        id: Number(req.params.id),
        cantidadStock: req.body.cantidadStock,
      });
      res.json(ingrediente);
    },
  };
}

module.exports = { crearIngredientesControlador };
