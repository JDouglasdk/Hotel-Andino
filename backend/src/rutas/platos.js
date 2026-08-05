const express = require('express');
const { crearRequiereRol } = require('../middlewares/autenticacion');
const { validar } = require('../middlewares/validacion');
const { esquemaIdParametro } = require('../esquemas/comunEsquemas');
const {
  esquemaCrearPlato,
  esquemaActualizarPlato,
  esquemaCambiarDisponibilidadPlato,
  esquemaFiltrarPlatos,
  esquemaReemplazarReceta,
} = require('../esquemas/platosEsquemas');

function crearRutasPlatos({ controlador, requiereSesion }) {
  const router = express.Router();
  const requiereAdmin = crearRequiereRol('admin');

  router.get('/', requiereSesion, validar({ consulta: esquemaFiltrarPlatos }), controlador.listar);
  router.post('/', requiereSesion, requiereAdmin, validar({ cuerpo: esquemaCrearPlato }), controlador.crear);
  router.put('/:id', requiereSesion, requiereAdmin, validar({ parametros: esquemaIdParametro, cuerpo: esquemaActualizarPlato }), controlador.actualizar);
  router.patch('/:id/disponibilidad', requiereSesion, requiereAdmin, validar({ parametros: esquemaIdParametro, cuerpo: esquemaCambiarDisponibilidadPlato }), controlador.cambiarDisponibilidad);
  router.post('/:id/receta', requiereSesion, requiereAdmin, validar({ parametros: esquemaIdParametro, cuerpo: esquemaReemplazarReceta }), controlador.reemplazarReceta);

  return router;
}

module.exports = { crearRutasPlatos };
