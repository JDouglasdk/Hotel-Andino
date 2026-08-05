const { ErrorDeNegocio, ErrorNoEncontrado } = require('../utilidades/errores');

function crearCategoriasServicio({ categoriasRepositorio }) {
  function crearCategoria({ nombre }) {
    const existente = categoriasRepositorio.obtenerPorNombre(nombre);
    if (existente) {
      throw new ErrorDeNegocio('Ya existe una categoría con ese nombre', {
        codigo: 'CATEGORIA_DUPLICADA',
        status: 409,
      });
    }
    return categoriasRepositorio.crear({ nombre });
  }

  function obtenerPorId(id) {
    const categoria = categoriasRepositorio.obtenerPorId(id);
    if (!categoria) {
      throw new ErrorNoEncontrado('No existe una categoría con ese id');
    }
    return categoria;
  }

  function listarTodas() {
    return categoriasRepositorio.listarTodas();
  }

  return { crearCategoria, obtenerPorId, listarTodas };
}

module.exports = { crearCategoriasServicio };
