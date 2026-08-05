const express = require('express');

// Caja diaria: rol de jefeDeCaja (y admin, para poder auditar). Platos
// servidos por franja: además de caja/admin, le sirve a cocina para
// trazabilidad de lo entregado en el día.
function crearRutasReportes({ controlador, requiereSesion, requiereRol }) {
  const router = express.Router();

  router.get('/caja-diaria', requiereSesion, requiereRol('admin', 'jefeDeCaja'), controlador.cajaDelDia);
  router.get(
    '/platos-servidos',
    requiereSesion,
    requiereRol('admin', 'jefeDeCaja', 'cocina'),
    controlador.platosServidosPorFranja
  );

  return router;
}

module.exports = { crearRutasReportes };
