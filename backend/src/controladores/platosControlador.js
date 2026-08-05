function crearPlatosControlador({ platosServicio }) {
  return {
    listar(req, res) {
      const { categoriaId, disponible } = req.query;
      res.json(platosServicio.listarPlatos({ categoriaId, disponible }));
    },
    crear(req, res) {
      const plato = platosServicio.crearPlato({
        categoriaId: req.body.categoriaId,
        nombre: req.body.nombre,
        precio: req.body.precio,
        informacion: req.body.informacion,
      });
      res.status(201).json(plato);
    },
    actualizar(req, res) {
      const plato = platosServicio.actualizarPlato({
        id: Number(req.params.id),
        categoriaId: req.body.categoriaId,
        nombre: req.body.nombre,
        precio: req.body.precio,
        informacion: req.body.informacion,
      });
      res.json(plato);
    },
    cambiarDisponibilidad(req, res) {
      const plato = platosServicio.cambiarDisponibilidadPlato({ id: Number(req.params.id), disponible: req.body.disponible });
      res.json(plato);
    },
    reemplazarReceta(req, res) {
      const receta = platosServicio.reemplazarReceta({ platoId: Number(req.params.id), items: req.body.items });
      res.json(receta);
    },
  };
}

module.exports = { crearPlatosControlador };
