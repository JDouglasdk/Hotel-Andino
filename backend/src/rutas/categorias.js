const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');
const { validar } = require('../middlewares/validacion');
const { esquemaIdParametro } = require('../esquemas/comunEsquemas');
const { esquemaCrearCategoria, esquemaActualizarCategoria } = require('../esquemas/categoriasEsquemas');

function crearRutasCategorias({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereAdmin = crearRequiereRol('admin');

  router.get('/', requiereSesion, controlador.listar);
  router.post('/', requiereSesion, requiereAdmin, validar({ cuerpo: esquemaCrearCategoria }), controlador.crear);
  router.put('/:id', requiereSesion, requiereAdmin, validar({ parametros: esquemaIdParametro, cuerpo: esquemaActualizarCategoria }), controlador.actualizar);

  return router;
}

module.exports = { crearRutasCategorias };
