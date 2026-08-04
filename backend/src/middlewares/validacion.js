const { ZodError } = require('zod');
const { ErrorDeNegocio } = require('../utilidades/errores');

function formatearError(error) {
  return error.issues.map((problema) => `${problema.path.join('.') || 'body'}: ${problema.message}`).join('; ');
}

function validar({ cuerpo, consulta, parametros } = {}) {
  return function validarPeticion(req, res, next) {
    try {
      if (cuerpo) req.body = cuerpo.parse(req.body);
      if (consulta) req.query = consulta.parse(req.query);
      if (parametros) {
        const datos = parametros.parse(req.params);
        Object.assign(req.params, datos);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new ErrorDeNegocio(formatearError(error), { codigo: 'DATOS_INVALIDOS', status: 422 }));
      }
      next(error);
    }
  };
}

module.exports = { validar };
