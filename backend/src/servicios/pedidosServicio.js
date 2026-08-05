const { ErrorDeNegocio } = require('../utilidades/errores');

// Debe coincidir exactamente con el CHECK de la columna `estado` en
// backend/src/db/migraciones/007_crear_pedidos.sql. Clave "estadoActual->nuevoEstado".
const TRANSICIONES_PERMITIDAS = {
  'pendiente->en_preparacion': ['cocina'],
  'en_preparacion->listo': ['cocina'],
  'listo->entregado': ['mesero'],
  'pendiente->cancelado': ['mesero', 'cocina'],
  'en_preparacion->cancelado': ['mesero', 'cocina'],
};

function crearPedidosServicio({ pedidosRepositorio, huespedesRepositorio, platosRepositorio, derechoDeComidasServicio, inventarioServicio }) {
  function verificarHuespedExiste(huespedId) {
    if (!huespedesRepositorio.buscarPorId(huespedId)) {
      throw new ErrorDeNegocio(`El huésped ${huespedId} no existe`, { codigo: 'HUESPED_NO_ENCONTRADO', status: 404 });
    }
  }

  function verificarPlatoDisponible(platoId) {
    const plato = platosRepositorio.buscarPorId(platoId);
    if (!plato) {
      throw new ErrorDeNegocio(`El plato ${platoId} no existe`, { codigo: 'PLATO_NO_ENCONTRADO', status: 404 });
    }
    if (!plato.disponible) {
      throw new ErrorDeNegocio(`El plato ${platoId} no está disponible`, { codigo: 'PLATO_NO_DISPONIBLE', status: 409 });
    }
    return plato;
  }

  function verificarPedidoExiste(id) {
    const pedido = pedidosRepositorio.buscarPorId(id);
    if (!pedido) {
      throw new ErrorDeNegocio(`El pedido ${id} no existe`, { codigo: 'NO_ENCONTRADO', status: 404 });
    }
    return pedido;
  }

  return {
    crearPedido({ huespedId, usuarioId, franja, items }) {
      verificarHuespedExiste(huespedId);
      const itemsConPrecio = items.map((item) => {
        const plato = verificarPlatoDisponible(item.platoId);
        return { platoId: item.platoId, cantidad: item.cantidad, precioUnitario: plato.precio };
      });

      derechoDeComidasServicio.validarDerecho({ huespedId, franja });

      const pedido = pedidosRepositorio.crear({ huespedId, usuarioId, franja, items: itemsConPrecio });

      inventarioServicio.descontarPorPedido({ items: items.map((item) => ({ platoId: item.platoId, cantidad: item.cantidad })) });

      return pedido;
    },

    cambiarEstadoPedido({ id, nuevoEstado, rol }) {
      const pedido = verificarPedidoExiste(id);
      const clave = `${pedido.estado}->${nuevoEstado}`;
      const rolesPermitidos = TRANSICIONES_PERMITIDAS[clave];
      if (!rolesPermitidos) {
        throw new ErrorDeNegocio(`No se puede pasar de "${pedido.estado}" a "${nuevoEstado}"`, { codigo: 'TRANSICION_INVALIDA', status: 409 });
      }
      if (!rolesPermitidos.includes(rol)) {
        throw new ErrorDeNegocio('No tiene permiso para esta acción', { codigo: 'NO_AUTORIZADO', status: 403 });
      }
      return pedidosRepositorio.cambiarEstado({ id, estado: nuevoEstado });
    },

    obtenerPedidoPorId(id) {
      return verificarPedidoExiste(id);
    },

    listarPedidos({ estado, franja } = {}) {
      return pedidosRepositorio.listar({ estado, franja });
    },
  };
}

module.exports = { crearPedidosServicio };
