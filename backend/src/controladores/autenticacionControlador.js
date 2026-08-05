const { z } = require('zod');
const { ErrorDeNegocio } = require('../utilidades/errores');

const esquemaIniciarSesion = z.object({
  correo: z.string().trim().min(1).max(150),
  contrasena: z.string().min(1).max(200),
});

function crearAutenticacionControlador({ autenticacionServicio }) {
  function iniciarSesion(req, res, next) {
    const resultado = esquemaIniciarSesion.safeParse(req.body);
    if (!resultado.success) {
      return next(new ErrorDeNegocio('Correo o contraseña incorrectos', {
        codigo: 'CREDENCIALES_INVALIDAS',
        status: 401,
      }));
    }

    try {
      const usuario = autenticacionServicio.iniciarSesion(resultado.data);
      req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.usuarioId = usuario.id;
        return res.status(200).json({ usuario });
      });
    } catch (error) {
      return next(error);
    }
  }

  function cerrarSesion(req, res, next) {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie('sesionHotel');
      return res.status(204).end();
    });
  }

  function quienSoy(req, res) {
    return res.status(200).json({ usuario: req.usuario });
  }

  return { iniciarSesion, cerrarSesion, quienSoy };
}

module.exports = { crearAutenticacionControlador };
