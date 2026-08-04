function crearAutenticacionControlador({ autenticacionServicio, usuariosServicio }) {
  return {
    login(req, res, next) {
      const usuario = autenticacionServicio.verificarCredenciales({ correo: req.body.correo, contrasena: req.body.contrasena });
      req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.usuarioId = usuario.id;
        res.json(usuario);
      });
    },

    logout(req, res) {
      req.session.destroy(() => {
        res.status(200).json({ mensaje: 'Sesión cerrada' });
      });
    },

    yo(req, res) {
      const usuario = usuariosServicio.obtenerUsuarioPorId(req.usuario.id);
      res.json({ id: usuario.id, nombreCompleto: usuario.nombreCompleto, rol: usuario.rol });
    },
  };
}

module.exports = { crearAutenticacionControlador };
