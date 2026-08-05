const { ErrorDeNegocio, ErrorNoEncontrado } = require('../utilidades/errores');

function crearCategoriasServicio({ categoriasRepositorio }) {
  return {
    crearCategoria({ nombre }) {
      if (categoriasRepositorio.buscarPorNombre(nombre)) {
        throw new ErrorDeNegocio(`Ya existe una categoría con el nombre ${nombre}`, { codigo: 'CATEGORIA_DUPLICADA', status: 409 });
      }
      return categoriasRepositorio.crear({ nombre });
    },

    actualizarCategoria({ id, nombre }) {
      if (!categoriasRepositorio.buscarPorId(id)) {
        throw new ErrorNoEncontrado(`La categoría ${id} no existe`);
      }
      const existente = categoriasRepositorio.buscarPorNombre(nombre);
      if (existente && existente.id !== id) {
        throw new ErrorDeNegocio(`Ya existe una categoría con el nombre ${nombre}`, { codigo: 'CATEGORIA_DUPLICADA', status: 409 });
      }
      return categoriasRepositorio.actualizar({ id, nombre });
    },

    listarCategorias() {
      return categoriasRepositorio.listarTodas();
    },
  };
}

module.exports = { crearCategoriasServicio };
