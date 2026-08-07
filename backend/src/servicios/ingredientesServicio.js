const { ErrorDeNegocio } = require('../utilidades/errores');

function crearIngredientesServicio({ ingredientesRepositorio, recetasRepositorio, movimientosIngredienteRepositorio, conexion }) {
  function verificarIngredienteExiste(id) {
    const ingrediente = ingredientesRepositorio.buscarPorId(id);
    if (!ingrediente) {
      throw new ErrorDeNegocio(`El ingrediente ${id} no existe`, { codigo: 'INGREDIENTE_NO_ENCONTRADO', status: 404 });
    }
    return ingrediente;
  }

  // Único lugar que hace el UPDATE de stock + INSERT de bitácora, juntos.
  // No abre transacción propia (better-sqlite3 no permite anidarlas) —
  // quien llama decide el límite atómico vía ejecutarAtomico.
  function aplicarMovimiento({ id, delta, motivo, usuarioId, pedidoId = null, movimientoOrigenId = null }) {
    const ingrediente = verificarIngredienteExiste(id);
    const filasAfectadas = ingredientesRepositorio.incrementarStock({ id, delta });
    if (filasAfectadas === 0) {
      throw new ErrorDeNegocio(
        `Stock insuficiente de "${ingrediente.nombre}" (disponible: ${ingrediente.cantidadStock} ${ingrediente.unidadMedida})`,
        { codigo: 'STOCK_INSUFICIENTE', status: 409 }
      );
    }
    const actualizado = ingredientesRepositorio.buscarPorId(id);
    return movimientosIngredienteRepositorio.registrar({
      ingredienteId: id, delta, motivo, usuarioId, pedidoId, movimientoOrigenId,
      cantidadResultante: actualizado.cantidadStock,
    });
  }

  // `conexion.inTransaction` deja que el mismo aplicarMovimiento sirva
  // llamado suelto (abre su propia transacción) o desde dentro de una ya
  // abierta por inventarioServicio (varios ítems de un pedido) sin anidar.
  function ejecutarAtomico(fn) {
    return conexion.inTransaction ? fn() : conexion.transaction(fn)();
  }

  function descontarStockSiHay(id, cantidad, { usuarioId, pedidoId }) {
    return ejecutarAtomico(() => aplicarMovimiento({ id, delta: -cantidad, motivo: 'consumo_comanda', usuarioId, pedidoId }));
  }

  function descontarPorReceta(platoId, cantidadPlatos, { usuarioId, pedidoId }) {
    const receta = recetasRepositorio.obtenerPorPlato(platoId);
    if (receta.length === 0) {
      throw new ErrorDeNegocio(`El plato ${platoId} no tiene una receta definida`, { codigo: 'RECETA_NO_DEFINIDA', status: 409 });
    }
    for (const item of receta) {
      descontarStockSiHay(item.ingredienteId, item.cantidadRequerida * cantidadPlatos, { usuarioId, pedidoId });
    }
  }

  return {
    crearIngrediente({ nombre, cantidadStock, unidadMedida, usuarioId }) {
      if (ingredientesRepositorio.buscarPorNombre(nombre)) {
        throw new ErrorDeNegocio(`Ya existe un ingrediente con el nombre ${nombre}`, { codigo: 'INGREDIENTE_DUPLICADO', status: 409 });
      }
      return ingredientesRepositorio.crear({ nombre, cantidadStock, unidadMedida, usuarioId });
    },

    // Ajuste manual desde admin: `motivo` restringido a compra/merma/ajuste
    // por esquemaRegistrarMovimiento (validación en la capa de rutas) —
    // nunca acepta los dos motivos de sistema desde este método.
    registrarMovimiento({ id, delta, motivo, usuarioId }) {
      return ejecutarAtomico(() => aplicarMovimiento({ id, delta, motivo, usuarioId }));
    },

    listarMovimientos(id) {
      verificarIngredienteExiste(id);
      return movimientosIngredienteRepositorio.listarPorIngrediente(id);
    },

    // Revierte exactamente lo que este pedido consumió (bitácora, no
    // receta actual — ver docs/superpowers/specs/2026-08-06-bitacora-inventario-design.md).
    // Todos los ingredientes del pedido se restituyen en una sola
    // transacción. Si el pedido no tiene consumo_comanda propio (dato
    // preexistente a esta feature), no hace nada — no hay forma de saber
    // qué se consumió realmente sin ese historial.
    restituirConsumosDePedido({ pedidoId, usuarioId }) {
      const consumos = movimientosIngredienteRepositorio.listarPorPedido(pedidoId, 'consumo_comanda');
      if (consumos.length === 0) return;
      conexion.transaction(() => {
        for (const consumo of consumos) {
          aplicarMovimiento({
            id: consumo.ingredienteId,
            delta: -consumo.delta,
            motivo: 'restitucion_cancelacion',
            usuarioId,
            pedidoId,
            movimientoOrigenId: consumo.id,
          });
        }
      })();
    },

    listarIngredientes() {
      return ingredientesRepositorio.listarTodos();
    },

    descontarStockSiHay,
    descontarPorReceta,
  };
}

module.exports = { crearIngredientesServicio };
