const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');
const { validar } = require('../middlewares/validacion');
const { esquemaIdParametro } = require('../esquemas/comunEsquemas');
const { esquemaCrearPedido, esquemaCambiarEstadoPedido, esquemaFiltrarPedidos } = require('../esquemas/pedidosEsquemas');

function crearRutasPedidos({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereMesero = crearRequiereRol('mesero');

  router.get('/', requiereSesion, validar({ consulta: esquemaFiltrarPedidos }), controlador.listar);
  router.get('/:id', requiereSesion, validar({ parametros: esquemaIdParametro }), controlador.obtenerPorId);
  router.post('/', requiereSesion, requiereMesero, validar({ cuerpo: esquemaCrearPedido }), controlador.crear);
  router.patch('/:id/estado', requiereSesion, validar({ parametros: esquemaIdParametro, cuerpo: esquemaCambiarEstadoPedido }), controlador.cambiarEstado);

  return router;
}

module.exports = { crearRutasPedidos };
