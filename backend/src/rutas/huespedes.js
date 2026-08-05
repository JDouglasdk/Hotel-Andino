const express = require('express');

// Cualquier rol autenticado puede consultar huéspedes (lo necesita el
// mesero para tomar la comanda, cocina/jefeDeCaja para trazabilidad).
// Crear/editar queda restringido a admin/mesero — a definir con el equipo
// si jefeDeCaja también debería poder dar de alta huéspedes.
function crearRutasHuespedes({ controlador, requiereSesion, requiereRol }) {
  const router = express.Router();

  router.get('/', requiereSesion, controlador.listar);
  router.get('/:documento', requiereSesion, controlador.obtenerPorDocumento);
  router.get('/:documento/plan-alimentacion', requiereSesion, controlador.planAlimentacion);
  router.post('/', requiereSesion, requiereRol('admin', 'mesero'), controlador.crear);

  return router;
}

module.exports = { crearRutasHuespedes };
