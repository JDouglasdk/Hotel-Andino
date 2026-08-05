const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');

function crearRutasReportes({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereJefeDeCajaOAdmin = crearRequiereRol('jefeDeCaja', 'admin');

  router.get('/caja-del-dia', requiereSesion, requiereJefeDeCajaOAdmin, controlador.cajaDelDia);
  router.get('/platos-por-franja', requiereSesion, requiereJefeDeCajaOAdmin, controlador.platosServidosPorFranja);

  return router;
}

module.exports = { crearRutasReportes };
