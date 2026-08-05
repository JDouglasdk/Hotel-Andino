const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');
const { validar } = require('../middlewares/validacion');
const { esquemaCrearHuesped, esquemaBuscarHuespedPorDocumento } = require('../esquemas/huespedesEsquemas');

function crearRutasHuespedes({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereMeseroOAdmin = crearRequiereRol('mesero', 'admin');

  router.get('/', requiereSesion, validar({ consulta: esquemaBuscarHuespedPorDocumento }), controlador.buscarPorDocumento);
  router.post('/', requiereSesion, requiereMeseroOAdmin, validar({ cuerpo: esquemaCrearHuesped }), controlador.crear);

  return router;
}

module.exports = { crearRutasHuespedes };
