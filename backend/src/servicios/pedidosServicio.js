const { ErrorDeNegocio, ErrorNoEncontrado } = require('../utilidades/errores');

// Regla de negocio central del reto (ver docs/decisiones.md): cuántas
// franjas distintas por día tiene derecho a consumir cada tipo de huésped.
const LIMITES_COMIDAS_POR_TIPO = { ordinario: 1, ejecutivo: 2, vip: 3 };

const FRANJAS_VALIDAS = ['desayuno', 'almuerzo', 'cena'];

// Máquina de estados de la comanda (ver migración 007): desde cualquier
// estado no terminal se puede cancelar; el resto avanza en un solo sentido.
const TRANSICIONES_VALIDAS = {
  pendiente: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo', 'cancelado'],
  listo: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

// Recibe `conexion` (además de los repositorios/servicios) porque crear una
// comanda es una operación atómica que toca tres cosas a la vez: la comanda
// misma, sus items y el descuento de inventario según receta. Si falla el
// descuento de un ingrediente a mitad de camino, toda la comanda debe
// revertirse — no puede quedar una comanda a medio confirmar.
function crearPedidosServicio({
  pedidosRepositorio,
  huespedesServicio,
  platosServicio,
  ingredientesServicio,
  conexion,
}) {
  function validarDerechoDeComidas(huesped, franja) {
    const limite = LIMITES_COMIDAS_POR_TIPO[huesped.tipo_huesped];
    const franjasConsumidas = pedidosRepositorio.franjasConsumidasHoy(huesped.id);
    const yaConsumioEstaFranja = franjasConsumidas.includes(franja);

    // Tope absoluto: solo existen 3 franjas en el día. Si ya se consumieron
    // las 3 (caso típico de vip, límite=3), no queda ninguna disponible,
    // ni siquiera para "repetir" una franja ya usada — no hay nada más que
    // pedir hoy.
    if (franjasConsumidas.length >= FRANJAS_VALIDAS.length) {
      throw new ErrorDeNegocio(
        `El huésped ya consumió sus ${limite} comida(s) del día (tipo ${huesped.tipo_huesped})`,
        { codigo: 'LIMITE_COMIDAS_EXCEDIDO', status: 409 }
      );
    }

    if (!yaConsumioEstaFranja && franjasConsumidas.length >= limite) {
      throw new ErrorDeNegocio(
        `El huésped ya consumió sus ${limite} comida(s) del día (tipo ${huesped.tipo_huesped})`,
        { codigo: 'LIMITE_COMIDAS_EXCEDIDO', status: 409 }
      );
    }
  }

  // Consulta (sin crear nada) el plan de alimentación del huésped para hoy:
  // cuántas comidas tiene derecho, cuántas ya consumió y qué franjas todavía
  // puede pedir. Reutiliza `validarDerechoDeComidas` (simulándola franja por
  // franja) para no duplicar la regla de negocio en dos lugares.
  function consultarPlanAlimentacion(huespedId) {
    const huesped = huespedesServicio.obtenerPorId(huespedId);
    const limiteDiario = LIMITES_COMIDAS_POR_TIPO[huesped.tipo_huesped];
    const franjasConsumidasHoy = pedidosRepositorio.franjasConsumidasHoy(huesped.id);

    const franjasDisponiblesHoy = FRANJAS_VALIDAS.filter((franja) => {
      try {
        validarDerechoDeComidas(huesped, franja);
        return true;
      } catch (error) {
        return false;
      }
    });

    return {
      huespedId: huesped.id,
      tipoHuesped: huesped.tipo_huesped,
      limiteDiario,
      franjasConsumidasHoy,
      comidasRestantesHoy: Math.max(limiteDiario - franjasConsumidasHoy.length, 0),
      franjasDisponiblesHoy,
    };
  }

  function crearPedido({ huespedId, usuarioId, franja, items }) {
    if (!FRANJAS_VALIDAS.includes(franja)) {
      throw new ErrorDeNegocio('franja inválida', { codigo: 'FRANJA_INVALIDA' });
    }
    if (!items || items.length === 0) {
      throw new ErrorDeNegocio('La comanda debe incluir al menos un plato', { codigo: 'PEDIDO_VACIO' });
    }

    const huesped = huespedesServicio.obtenerPorId(huespedId);
    validarDerechoDeComidas(huesped, franja);

    // Se valida disponibilidad ANTES de la transacción para poder devolver
    // un error de "plato no disponible" claro sin haber tocado inventario.
    const itemsConPlato = items.map((item) => ({
      plato: platosServicio.obtenerPlatoDisponible(item.platoId),
      cantidad: item.cantidad,
    }));

    const ejecutarCreacion = conexion.transaction(() => {
      const pedido = pedidosRepositorio.crear({ huespedId, usuarioId, franja });

      for (const { plato, cantidad } of itemsConPlato) {
        pedidosRepositorio.agregarItem({
          pedidoId: pedido.id,
          platoId: plato.id,
          cantidad,
          precioUnitario: plato.precio,
        });

        // Descuenta del inventario todos los ingredientes de la receta del
        // plato, escalados por la cantidad pedida. Lanza STOCK_INSUFICIENTE
        // si algún ingrediente no alcanza — better-sqlite3 revierte toda la
        // transacción (comanda + items + descuentos previos) al propagarse
        // la excepción fuera de conexion.transaction().
        ingredientesServicio.descontarPorReceta(plato.id, cantidad);
      }

      return pedido;
    });

    const pedido = ejecutarCreacion();
    return obtenerPedidoCompleto(pedido.id);
  }

  function obtenerPedidoCompleto(id) {
    const pedido = pedidosRepositorio.obtenerPorId(id);
    if (!pedido) {
      throw new ErrorNoEncontrado('No existe un pedido con ese id');
    }
    return { ...pedido, items: pedidosRepositorio.listarItemsPorPedido(id) };
  }

  function cambiarEstado(id, nuevoEstado) {
    const pedido = pedidosRepositorio.obtenerPorId(id);
    if (!pedido) {
      throw new ErrorNoEncontrado('No existe un pedido con ese id');
    }

    const permitidas = TRANSICIONES_VALIDAS[pedido.estado] ?? [];
    if (!permitidas.includes(nuevoEstado)) {
      throw new ErrorDeNegocio(`No se puede pasar de "${pedido.estado}" a "${nuevoEstado}"`, {
        codigo: 'TRANSICION_INVALIDA',
        status: 409,
      });
    }

    pedidosRepositorio.actualizarEstado(id, nuevoEstado);
    return obtenerPedidoCompleto(id);
  }

  function listarTodos() {
    return pedidosRepositorio.listarTodos();
  }

  return { crearPedido, obtenerPedidoCompleto, cambiarEstado, listarTodos, consultarPlanAlimentacion };
}

module.exports = { crearPedidosServicio, LIMITES_COMIDAS_POR_TIPO, FRANJAS_VALIDAS, TRANSICIONES_VALIDAS };
