const { ErrorDeNegocio } = require('../utilidades/errores');

function crearPlatosServicio({ platosRepositorio, categoriasRepositorio, recetasRepositorio, ingredientesRepositorio }) {
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

  function verificarIngredienteExiste(id) {
    if (!ingredientesRepositorio.buscarPorId(id)) {
      throw new ErrorDeNegocio(`El ingrediente ${id} no existe`, { codigo: 'INGREDIENTE_NO_ENCONTRADO', status: 404 });
    }
  }

  return {
    crearPlato({ categoriaId, nombre, precio, informacion, usuarioId }) {
      verificarCategoriaExiste(categoriaId);
      return platosRepositorio.crear({ categoriaId, nombre, precio, informacion, usuarioId });
    },

    actualizarPlato({ id, categoriaId, nombre, precio, informacion, usuarioId }) {
      verificarPlatoExiste(id);
      verificarCategoriaExiste(categoriaId);
      return platosRepositorio.actualizar({ id, categoriaId, nombre, precio, informacion, usuarioId });
    },

    cambiarDisponibilidadPlato({ id, disponible, usuarioId }) {
      verificarPlatoExiste(id);
      return platosRepositorio.cambiarDisponibilidad({ id, disponible, usuarioId });
    },

    listarPlatos({ categoriaId, disponible } = {}) {
      return platosRepositorio.listar({ categoriaId, disponible });
    },

    reemplazarReceta({ platoId, items }) {
      verificarPlatoExiste(platoId);
      items.forEach((item) => verificarIngredienteExiste(item.ingredienteId));
      recetasRepositorio.reemplazarPorPlato({ platoId, items });
      return recetasRepositorio.obtenerPorPlato(platoId);
    },
  };
}

module.exports = { crearPlatosServicio };
