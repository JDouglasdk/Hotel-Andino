const { ErrorDeNegocio } = require('../utilidades/errores');

function crearHuespedesServicio({ huespedesRepositorio }) {
  return {
    crearHuesped({ documento, nombreCompleto, telefono, tipoHuesped }) {
      if (huespedesRepositorio.buscarPorDocumento(documento)) {
        throw new ErrorDeNegocio(`Ya existe un huésped con el documento ${documento}`, { codigo: 'HUESPED_DUPLICADO', status: 409 });
      }
      return huespedesRepositorio.crear({ documento, nombreCompleto, telefono, tipoHuesped });
    },

    buscarHuespedPorDocumento(documento) {
      const huesped = huespedesRepositorio.buscarPorDocumento(documento);
      if (!huesped) {
        throw new ErrorDeNegocio(`No existe un huésped con el documento ${documento}`, { codigo: 'HUESPED_NO_ENCONTRADO', status: 404 });
      }
      return huesped;
    },
  };
}

module.exports = { crearHuespedesServicio };
