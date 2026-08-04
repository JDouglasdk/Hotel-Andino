const express = require('express');
const { crearLimitadorLogin } = require('../middlewares/limitadorLogin');
const { validar } = require('../middlewares/validacion');
const { esquemaLogin } = require('../esquemas/autenticacionEsquemas');

function crearRutasAutenticacion({ controlador, requiereSesion }) {
  const router = express.Router();
  const limitadorLogin = crearLimitadorLogin();

  router.post('/login', limitadorLogin, validar({ cuerpo: esquemaLogin }), controlador.login);
  router.post('/logout', requiereSesion, controlador.logout);
  router.get('/yo', requiereSesion, controlador.yo);

  return router;
}

module.exports = { crearRutasAutenticacion };
