const { ErrorDeNegocio, ErrorNoEncontrado } = require('../utilidades/errores');

function crearCategoriasServicio({ categoriasRepositorio }) {
  return {
    crearCategoria({ nombre, usuarioId }) {
      if (categoriasRepositorio.buscarPorNombre(nombre)) {
        throw new ErrorDeNegocio(`Ya existe una categoría con el nombre ${nombre}`, { codigo: 'CATEGORIA_DUPLICADA', status: 409 });
      }
      return categoriasRepositorio.crear({ nombre, usuarioId });
    },

    actualizarCategoria({ id, nombre, usuarioId }) {
      if (!categoriasRepositorio.buscarPorId(id)) {
        throw new ErrorNoEncontrado(`La categoría ${id} no existe`);
      }
      const existente = categoriasRepositorio.buscarPorNombre(nombre);
      if (existente && existente.id !== id) {
        throw new ErrorDeNegocio(`Ya existe una categoría con el nombre ${nombre}`, { codigo: 'CATEGORIA_DUPLICADA', status: 409 });
      }
      return categoriasRepositorio.actualizar({ id, nombre, usuarioId });
    },

    listarCategorias() {
      return categoriasRepositorio.listarTodas();
    },
  };
}

module.exports = { crearCategoriasServicio };
