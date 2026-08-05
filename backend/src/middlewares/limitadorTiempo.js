const { ErrorDeNegocio } = require('../utilidades/errores');

/**
 * Reemplazo liviano de `connect-timeout`, sin dependencias externas.
 * El paquete `connect-timeout` está sin mantenimiento y fuerza versiones
 * antiguas de `ms`, `http-errors` y `on-finished` (una de ellas con una
 * vulnerabilidad conocida de ReDoS en `ms@2.0.0`). Esta versión propia
 * cubre el mismo caso de uso: si la respuesta no terminó dentro del
 * plazo, corta con un error controlado en vez de dejar la petición colgada.
 */
function crearLimitadorTiempo(milisegundos = 5000) {
  return function limitadorTiempo(req, res, next) {
    const temporizador = setTimeout(() => {
      if (res.headersSent) return;
      req.seAgotoElTiempo = true;
      next(new ErrorDeNegocio('La solicitud tardó demasiado en procesarse', {
        codigo: 'TIEMPO_AGOTADO',
        status: 503,
      }));
    }, milisegundos);

    // No debe mantener vivo el proceso solo por este timer
    temporizador.unref();

    const limpiar = () => clearTimeout(temporizador);
    res.once('finish', limpiar);
    res.once('close', limpiar);

    next();
  };
}

module.exports = { crearLimitadorTiempo };
