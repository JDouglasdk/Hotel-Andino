const express = require('express');

function crearRutasAutenticacion({ controlador, requiereSesion }) {
  const router = express.Router();

  router.post('/login', controlador.iniciarSesion);
  router.post('/logout', controlador.cerrarSesion);
  router.get('/quien-soy', requiereSesion, controlador.quienSoy);

  return router;
}

module.exports = { crearRutasAutenticacion };
