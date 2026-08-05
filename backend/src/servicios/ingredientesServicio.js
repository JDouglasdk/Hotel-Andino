const { ErrorDeNegocio } = require('../utilidades/errores');

function crearIngredientesServicio({ ingredientesRepositorio, recetasRepositorio }) {
  function verificarIngredienteExiste(id) {
    const ingrediente = ingredientesRepositorio.buscarPorId(id);
    if (!ingrediente) {
      throw new ErrorDeNegocio(`El ingrediente ${id} no existe`, { codigo: 'INGREDIENTE_NO_ENCONTRADO', status: 404 });
    }
    return ingrediente;
  }

  function descontarStockSiHay(id, cantidad) {
    const ingrediente = verificarIngredienteExiste(id);
    const filasAfectadas = ingredientesRepositorio.descontarStockSiHay({ id, cantidad });
    if (filasAfectadas === 0) {
      throw new ErrorDeNegocio(
        `Stock insuficiente de "${ingrediente.nombre}" (disponible: ${ingrediente.cantidadStock} ${ingrediente.unidadMedida})`,
        { codigo: 'STOCK_INSUFICIENTE', status: 409 }
      );
    }
  }

  function descontarPorReceta(platoId, cantidadPlatos) {
    const receta = recetasRepositorio.obtenerPorPlato(platoId);
    if (receta.length === 0) {
      throw new ErrorDeNegocio(`El plato ${platoId} no tiene una receta definida`, { codigo: 'RECETA_NO_DEFINIDA', status: 409 });
    }
    for (const item of receta) {
      descontarStockSiHay(item.ingredienteId, item.cantidadRequerida * cantidadPlatos);
    }
  }

  return {
    crearIngrediente({ nombre, cantidadStock, unidadMedida }) {
      if (ingredientesRepositorio.buscarPorNombre(nombre)) {
        throw new ErrorDeNegocio(`Ya existe un ingrediente con el nombre ${nombre}`, { codigo: 'INGREDIENTE_DUPLICADO', status: 409 });
      }
      return ingredientesRepositorio.crear({ nombre, cantidadStock, unidadMedida });
    },

    actualizarStock({ id, cantidadStock }) {
      verificarIngredienteExiste(id);
      return ingredientesRepositorio.actualizarStock({ id, cantidadStock });
    },

    listarIngredientes() {
      return ingredientesRepositorio.listarTodos();
    },

    descontarStockSiHay,
    descontarPorReceta,
  };
}

module.exports = { crearIngredientesServicio };
