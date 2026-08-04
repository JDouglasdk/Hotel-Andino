const rateLimit = require('express-rate-limit');

function crearLimitadorGeneral() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({ error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Demasiadas peticiones. Intente de nuevo más tarde.' } });
    },
  });
}

module.exports = { crearLimitadorGeneral };
