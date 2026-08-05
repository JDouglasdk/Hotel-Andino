const { ErrorDeNegocio, ErrorNoEncontrado } = require('../utilidades/errores');

// Tipos válidos de huésped. Se define acá (no solo en el esquema zod del
// controlador) porque determina cuántas comidas diarias tiene derecho a
// consumir el huésped — regla de negocio que otros servicios (pedidos)
// necesitarán consultar más adelante. Una sola fuente de verdad.
const TIPOS_HUESPED_VALIDOS = ['ordinario', 'ejecutivo', 'vip'];

function crearHuespedesServicio({ huespedesRepositorio }) {
  function crearHuesped({ documento, nombreCompleto, telefono, tipoHuesped }) {
    if (!TIPOS_HUESPED_VALIDOS.includes(tipoHuesped)) {
      throw new ErrorDeNegocio('tipo_huesped inválido', { codigo: 'TIPO_HUESPED_INVALIDO' });
    }

    const existente = huespedesRepositorio.obtenerPorDocumento(documento);
    if (existente) {
      throw new ErrorDeNegocio('Ya existe un huésped registrado con ese documento', {
        codigo: 'DOCUMENTO_DUPLICADO',
        status: 409,
      });
    }

    return huespedesRepositorio.crear({ documento, nombreCompleto, telefono, tipoHuesped });
  }

  function buscarPorDocumento(documento) {
    const huesped = huespedesRepositorio.obtenerPorDocumento(documento);
    if (!huesped) {
      throw new ErrorNoEncontrado('No existe un huésped con ese documento');
    }
    return huesped;
  }

  function obtenerPorId(id) {
    const huesped = huespedesRepositorio.obtenerPorId(id);
    if (!huesped) {
      throw new ErrorNoEncontrado('No existe un huésped con ese id');
    }
    return huesped;
  }

  function listarTodos() {
    return huespedesRepositorio.listarTodos();
  }

  return { crearHuesped, buscarPorDocumento, obtenerPorId, listarTodos };
}

module.exports = { crearHuespedesServicio, TIPOS_HUESPED_VALIDOS };
