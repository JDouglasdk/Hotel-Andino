const { ErrorDeNegocio } = require('../utilidades/errores');

function crearPlatosServicio({ platosRepositorio, categoriasRepositorio }) {
  function verificarCategoriaExiste(categoriaId) {
    if (!categoriasRepositorio.buscarPorId(categoriaId)) {
      throw new ErrorDeNegocio(`La categoría ${categoriaId} no existe`, { codigo: 'CATEGORIA_NO_ENCONTRADA', status: 404 });
    }
  }

  function verificarPlatoExiste(id) {
    if (!platosRepositorio.buscarPorId(id)) {
      throw new ErrorDeNegocio(`El plato ${id} no existe`, { codigo: 'PLATO_NO_ENCONTRADO', status: 404 });
    }
  }

  return {
    crearPlato({ categoriaId, nombre, precio, informacion }) {
      verificarCategoriaExiste(categoriaId);
      return platosRepositorio.crear({ categoriaId, nombre, precio, informacion });
    },

    actualizarPlato({ id, categoriaId, nombre, precio, informacion }) {
      verificarPlatoExiste(id);
      verificarCategoriaExiste(categoriaId);
      return platosRepositorio.actualizar({ id, categoriaId, nombre, precio, informacion });
    },

    cambiarDisponibilidadPlato({ id, disponible }) {
      verificarPlatoExiste(id);
      return platosRepositorio.cambiarDisponibilidad({ id, disponible });
    },

    listarPlatos({ categoriaId, disponible } = {}) {
      return platosRepositorio.listar({ categoriaId, disponible });
    },
  };
}

module.exports = { crearPlatosServicio };
