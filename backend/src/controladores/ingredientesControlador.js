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
    registrarMovimiento(req, res) {
      const movimiento = ingredientesServicio.registrarMovimiento({
        id: Number(req.params.id),
        delta: req.body.delta,
        motivo: req.body.motivo,
        usuarioId: req.usuario.id,
      });
      res.status(201).json(movimiento);
    },
    listarMovimientos(req, res) {
      res.json(ingredientesServicio.listarMovimientos(Number(req.params.id)));
    },
  };
}

module.exports = { crearIngredientesControlador };
