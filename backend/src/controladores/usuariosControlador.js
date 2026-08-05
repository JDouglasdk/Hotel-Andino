const { z } = require('zod');
const { ErrorDeNegocio } = require('../utilidades/errores');
const { ROLES_VALIDOS } = require('../servicios/usuariosServicio');

const esquemaCrearUsuario = z.object({
  nombreCompleto: z.string().trim().min(1).max(150),
  correo: z.string().trim().email().max(150),
  contrasena: z.string().min(8).max(200),
  rol: z.enum(ROLES_VALIDOS),
});

function crearUsuariosControlador({ usuariosServicio }) {
  function crear(req, res, next) {
    const resultado = esquemaCrearUsuario.safeParse(req.body);
    if (!resultado.success) {
      return next(new ErrorDeNegocio('Datos de usuario inválidos', { codigo: 'VALIDACION', status: 400 }));
    }

    try {
      const usuario = usuariosServicio.crearUsuario(resultado.data);
      return res.status(201).json({ usuario });
    } catch (error) {
      return next(error);
    }
  }

  function listar(req, res, next) {
    try {
      const usuarios = usuariosServicio.listarTodos();
      return res.status(200).json({ usuarios });
    } catch (error) {
      return next(error);
    }
  }

  return { crear, listar };
}

module.exports = { crearUsuariosControlador };
