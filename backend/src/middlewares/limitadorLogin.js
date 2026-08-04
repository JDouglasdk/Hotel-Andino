const rateLimit = require('express-rate-limit');

// Límite mucho más estricto que el general (5 intentos / 15 min por IP) —
// mitiga fuerza bruta sobre credenciales, que es exactamente lo primero
// que se prueba en una evaluación de seguridad.
function crearLimitadorLogin() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({ error: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos de inicio de sesión. Intente de nuevo más tarde.' } });
    },
  });
}

module.exports = { crearLimitadorLogin };
