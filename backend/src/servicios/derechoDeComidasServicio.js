const { ErrorDeNegocio } = require('../utilidades/errores');

// Regla de negocio central del reto (ver docs/decisiones.md): cuántas
// franjas distintas por día tiene derecho a consumir cada tipo de huésped.
// Repetir un pedido en una franja ya consumida hoy NO cuenta contra el
// límite — solo franjas nuevas lo hacen.
const LIMITES_POR_TIPO = { ordinario: 1, ejecutivo: 2, vip: 3 };

function crearDerechoDeComidasServicio({ huespedesRepositorio, pedidosRepositorio }) {
  return {
    validarDerecho({ huespedId, franja }) {
      const huesped = huespedesRepositorio.buscarPorId(huespedId);
      const limite = LIMITES_POR_TIPO[huesped.tipoHuesped];
      const franjasConsumidas = pedidosRepositorio.franjasConsumidasHoy(huespedId);
      const yaConsumioEstaFranja = franjasConsumidas.includes(franja);

      if (!yaConsumioEstaFranja && franjasConsumidas.length >= limite) {
        throw new ErrorDeNegocio(
          `El huésped ya consumió sus ${limite} comida(s) del día`,
          { codigo: 'DERECHO_COMIDAS_EXCEDIDO', status: 409 }
        );
      }
    },
  };
}

module.exports = { crearDerechoDeComidasServicio };
