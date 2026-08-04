class ErrorDeNegocio extends Error {
  constructor(mensaje, { codigo = 'ERROR_DE_NEGOCIO', status = 400 } = {}) {
    super(mensaje);
    this.name = 'ErrorDeNegocio';
    this.codigo = codigo;
    this.status = status;
  }
}

class ErrorNoEncontrado extends ErrorDeNegocio {
  constructor(mensaje) {
    super(mensaje, { codigo: 'NO_ENCONTRADO', status: 404 });
    this.name = 'ErrorNoEncontrado';
  }
}

module.exports = { ErrorDeNegocio, ErrorNoEncontrado };
