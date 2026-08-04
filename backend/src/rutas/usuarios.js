const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');
const { validar } = require('../middlewares/validacion');
const { esquemaIdParametro } = require('../esquemas/comunEsquemas');
const { esquemaCrearUsuario, esquemaActualizarUsuario, esquemaCambiarEstadoUsuario } = require('../esquemas/usuariosEsquemas');

function crearRutasUsuarios({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereAdmin = crearRequiereRol('admin');

  router.get('/', requiereSesion, requiereAdmin, controlador.listar);
  router.post('/', requiereSesion, requiereAdmin, validar({ cuerpo: esquemaCrearUsuario }), controlador.crear);
  router.put('/:id', requiereSesion, requiereAdmin, validar({ parametros: esquemaIdParametro, cuerpo: esquemaActualizarUsuario }), controlador.actualizar);
  router.patch('/:id/estado', requiereSesion, requiereAdmin, validar({ parametros: esquemaIdParametro, cuerpo: esquemaCambiarEstadoUsuario }), controlador.cambiarEstado);

  return router;
}

module.exports = { crearRutasUsuarios };
