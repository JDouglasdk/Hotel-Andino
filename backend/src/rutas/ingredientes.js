const express = require('express');

function crearRutasIngredientes({ controlador, requiereSesion, requiereRol }) {
  const router = express.Router();

  router.get('/', requiereSesion, controlador.listar);
  router.post('/', requiereSesion, requiereRol('admin'), controlador.crear);
  router.patch('/:id/stock', requiereSesion, requiereRol('admin'), controlador.editarStock);

  return router;
}

module.exports = { crearRutasIngredientes };
