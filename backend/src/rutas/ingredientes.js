const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');
const { validar } = require('../middlewares/validacion');
const { esquemaIdParametro } = require('../esquemas/comunEsquemas');
const { esquemaCrearIngrediente, esquemaActualizarStock } = require('../esquemas/ingredientesEsquemas');

function crearRutasIngredientes({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereAdmin = crearRequiereRol('admin');

  router.get('/', requiereSesion, controlador.listar);
  router.post('/', requiereSesion, requiereAdmin, validar({ cuerpo: esquemaCrearIngrediente }), controlador.crear);
  router.patch('/:id/stock', requiereSesion, requiereAdmin, validar({ parametros: esquemaIdParametro, cuerpo: esquemaActualizarStock }), controlador.actualizarStock);

  return router;
}

module.exports = { crearRutasIngredientes };
