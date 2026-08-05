const express = require('express');

function crearRutasCategorias({ controlador, requiereSesion, requiereRol }) {
  const router = express.Router();

  router.get('/', requiereSesion, controlador.listar);
  router.post('/', requiereSesion, requiereRol('admin'), controlador.crear);

  return router;
}

module.exports = { crearRutasCategorias };
