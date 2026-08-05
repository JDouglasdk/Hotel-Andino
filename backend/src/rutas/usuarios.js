const express = require('express');

// Alta/consulta de personal: exclusivo de admin. CRUD amplio (editar,
// desactivar) queda fuera de este MVP — ver docs/decisiones.md, recortable #4.
function crearRutasUsuarios({ controlador, requiereSesion, requiereRol }) {
  const router = express.Router();

  router.get('/', requiereSesion, requiereRol('admin'), controlador.listar);
  router.post('/', requiereSesion, requiereRol('admin'), controlador.crear);

  return router;
}

module.exports = { crearRutasUsuarios };
