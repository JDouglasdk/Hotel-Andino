function crearCategoriasControlador({ categoriasServicio }) {
  return {
    listar(req, res) {
      res.json(categoriasServicio.listarCategorias());
    },
    crear(req, res) {
      const categoria = categoriasServicio.crearCategoria({ nombre: req.body.nombre });
      res.status(201).json(categoria);
    },
    actualizar(req, res) {
      const categoria = categoriasServicio.actualizarCategoria({ id: Number(req.params.id), nombre: req.body.nombre });
      res.json(categoria);
    },
  };
}

module.exports = { crearCategoriasControlador };
