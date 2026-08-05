const { ErrorDeNegocio, ErrorNoEncontrado } = require('../utilidades/errores');

// Recibe `recetasRepositorio` y `conexion` (además de `ingredientesRepositorio`)
// porque `descontarPorReceta` necesita leer `plato_ingrediente` (migración
// 006) y descontar varios ingredientes como una sola operación atómica.
function crearIngredientesServicio({ ingredientesRepositorio, recetasRepositorio, conexion }) {
  function crearIngrediente({ nombre, cantidadStock, unidadMedida }) {
    const existente = ingredientesRepositorio.obtenerPorNombre(nombre);
    if (existente) {
      throw new ErrorDeNegocio('Ya existe un ingrediente con ese nombre', {
        codigo: 'INGREDIENTE_DUPLICADO',
        status: 409,
      });
    }
    return ingredientesRepositorio.crear({ nombre, cantidadStock, unidadMedida });
  }

  // "Edición de stock": corrige el valor absoluto en inventario (alta ya
  // cubierta por crearIngrediente arriba). No es la vía para descontar por
  // venta — eso lo hace descontarStock/descontarPorReceta más abajo.
  function editarStock(id, cantidadStock) {
    obtenerPorId(id); // lanza ErrorNoEncontrado si no existe

    if (cantidadStock < 0) {
      throw new ErrorDeNegocio('La cantidad de stock no puede ser negativa', {
        codigo: 'STOCK_NEGATIVO',
        status: 400,
      });
    }

    return ingredientesRepositorio.actualizarStock(id, cantidadStock);
  }

  function obtenerPorId(id) {
    const ingrediente = ingredientesRepositorio.obtenerPorId(id);
    if (!ingrediente) {
      throw new ErrorNoEncontrado('No existe un ingrediente con ese id');
    }
    return ingrediente;
  }

  function listarTodos() {
    return ingredientesRepositorio.listarTodos();
  }

  // Lanza ErrorDeNegocio (no ErrorNoEncontrado) porque, desde el punto de
  // vista de quien está tomando la comanda, "no hay suficiente stock" es
  // una regla de negocio, no un dato inexistente.
  function descontarStock(id, cantidad) {
    const ingrediente = obtenerPorId(id);
    const cambios = ingredientesRepositorio.descontarStockSiHay(id, cantidad);
    if (cambios === 0) {
      throw new ErrorDeNegocio(
        `Stock insuficiente de "${ingrediente.nombre}" (disponible: ${ingrediente.cantidad_stock} ${ingrediente.unidad_medida})`,
        { codigo: 'STOCK_INSUFICIENTE', status: 409 }
      );
    }
  }

  // Descuenta del inventario todos los ingredientes de la receta de un
  // plato (plato_ingrediente, migración 006), escalados por `cantidadPlatos`.
  // Corre como una sola transacción reutilizando descontarStock por cada
  // ingrediente: si alguno no alcanza, esa función ya lanza ErrorDeNegocio
  // (STOCK_INSUFICIENTE) y better-sqlite3 revierte los descuentos previos
  // de la misma receta — nunca debe quedar un descuento parcial.
  function descontarPorReceta(platoId, cantidadPlatos) {
    if (!Number.isInteger(cantidadPlatos) || cantidadPlatos <= 0) {
      throw new ErrorDeNegocio('cantidadPlatos debe ser un entero mayor a 0', {
        codigo: 'CANTIDAD_INVALIDA',
        status: 400,
      });
    }

    const receta = recetasRepositorio.obtenerPorPlato(platoId);
    if (receta.length === 0) {
      throw new ErrorDeNegocio('El plato no tiene una receta definida', {
        codigo: 'RECETA_NO_DEFINIDA',
        status: 409,
      });
    }

    const ejecutarDescuento = conexion.transaction(() => {
      for (const item of receta) {
        descontarStock(item.ingrediente_id, item.cantidad_requerida * cantidadPlatos);
      }
    });

    ejecutarDescuento();
  }

  return { crearIngrediente, editarStock, obtenerPorId, listarTodos, descontarStock, descontarPorReceta };
}

module.exports = { crearIngredientesServicio };
