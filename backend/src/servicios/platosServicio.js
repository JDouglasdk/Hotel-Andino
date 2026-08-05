const { ErrorDeNegocio, ErrorNoEncontrado } = require('../utilidades/errores');

// Recibe `conexion` además de los repositorios porque el alta de un plato
// con receta escribe en dos tablas (`platos` y `plato_ingrediente`) y debe
// ser atómica: si falla un ingrediente de la receta, no debe quedar el
// plato creado sin receta completa.
function crearPlatosServicio({ platosRepositorio, recetasRepositorio, categoriasServicio, ingredientesServicio, conexion }) {
  function crearPlato({ categoriaId, nombre, precio, informacion, receta }) {
    categoriasServicio.obtenerPorId(categoriaId); // lanza ErrorNoEncontrado si no existe

    for (const item of receta) {
      ingredientesServicio.obtenerPorId(item.ingredienteId); // lanza ErrorNoEncontrado si no existe
    }

    const ejecutarAlta = conexion.transaction(() => {
      const plato = platosRepositorio.crear({ categoriaId, nombre, precio, informacion });
      for (const item of receta) {
        recetasRepositorio.agregarIngrediente({
          platoId: plato.id,
          ingredienteId: item.ingredienteId,
          cantidadRequerida: item.cantidadRequerida,
        });
      }
      return plato;
    });

    return ejecutarAlta();
  }

  function obtenerPorId(id) {
    const plato = platosRepositorio.obtenerPorId(id);
    if (!plato) {
      throw new ErrorNoEncontrado('No existe un plato con ese id');
    }
    return plato;
  }

  function obtenerRecetaDelPlato(platoId) {
    obtenerPorId(platoId);
    return recetasRepositorio.obtenerPorPlato(platoId);
  }

  function listarTodos() {
    return platosRepositorio.listarTodos();
  }

  // Usado por pedidosServicio para validar disponibilidad al tomar comanda.
  function obtenerPlatoDisponible(id) {
    const plato = obtenerPorId(id);
    if (!plato.disponible) {
      throw new ErrorDeNegocio(`El plato "${plato.nombre}" no está disponible`, {
        codigo: 'PLATO_NO_DISPONIBLE',
        status: 409,
      });
    }
    return plato;
  }

  return { crearPlato, obtenerPorId, obtenerRecetaDelPlato, listarTodos, obtenerPlatoDisponible };
}

module.exports = { crearPlatosServicio };
