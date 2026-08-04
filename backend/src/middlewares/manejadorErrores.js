const { ErrorDeNegocio } = require('../utilidades/errores');
const { logger } = require('../utilidades/logger');

function manejadorErrores(error, req, res, next) { // eslint-disable-line no-unused-vars
  if (error instanceof ErrorDeNegocio) {
    return res.status(error.status).json({ error: { codigo: error.codigo, mensaje: error.message } });
  }

  logger.error('Error no controlado', { mensaje: error.message, ruta: req.originalUrl, metodo: req.method });
  return res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado' } });
}

module.exports = { manejadorErrores };
