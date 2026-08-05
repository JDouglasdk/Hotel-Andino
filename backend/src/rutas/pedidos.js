const express = require('express');

// Registrar comanda: mesero/admin. Cambiar estado: cocina la avanza
// (pendiente→en_preparacion→listo), mesero la entrega; admin puede todo.
// Cualquiera de los cuatro roles puede consultar.
function crearRutasPedidos({ controlador, requiereSesion, requiereRol }) {
  const router = express.Router();

  router.get('/', requiereSesion, controlador.listar);
  router.get('/:id', requiereSesion, controlador.obtenerPorId);
  router.post('/', requiereSesion, requiereRol('admin', 'mesero'), controlador.crear);
  router.patch(
    '/:id/estado',
    requiereSesion,
    requiereRol('admin', 'mesero', 'cocina'),
    controlador.cambiarEstado
  );

  return router;
}

module.exports = { crearRutasPedidos };
