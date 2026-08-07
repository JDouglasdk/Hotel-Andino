const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');
const { validar } = require('../middlewares/validacion');
const { esquemaIdParametro } = require('../esquemas/comunEsquemas');
const { esquemaCrearIngrediente, esquemaRegistrarMovimiento } = require('../esquemas/ingredientesEsquemas');

function crearRutasIngredientes({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereAdmin = crearRequiereRol('admin');

  router.get('/', requiereSesion, controlador.listar);
  router.post('/', requiereSesion, requiereAdmin, validar({ cuerpo: esquemaCrearIngrediente }), controlador.crear);
  router.post('/:id/movimientos', requiereSesion, requiereAdmin, validar({ parametros: esquemaIdParametro, cuerpo: esquemaRegistrarMovimiento }), controlador.registrarMovimiento);
  router.get('/:id/movimientos', requiereSesion, validar({ parametros: esquemaIdParametro }), controlador.listarMovimientos);

  return router;
}

module.exports = { crearRutasIngredientes };
