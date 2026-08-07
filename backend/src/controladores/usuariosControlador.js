function crearUsuariosControlador({ usuariosServicio }) {
  return {
    listar(req, res) {
      res.json(usuariosServicio.listarUsuarios());
    },
    crear(req, res) {
      const usuario = usuariosServicio.crearUsuario({
        nombreCompleto: req.body.nombreCompleto,
        correo: req.body.correo,
        contrasena: req.body.contrasena,
        rol: req.body.rol,
        usuarioId: req.usuario.id,
      });
      res.status(201).json(usuario);
    },
    actualizar(req, res) {
      const usuario = usuariosServicio.actualizarUsuario({
        id: Number(req.params.id),
        nombreCompleto: req.body.nombreCompleto,
        correo: req.body.correo,
        rol: req.body.rol,
        usuarioId: req.usuario.id,
      });
      res.json(usuario);
    },
    cambiarEstado(req, res) {
      const usuario = usuariosServicio.cambiarEstadoUsuario({
        id: Number(req.params.id),
        activo: req.body.activo,
        usuarioId: req.usuario.id,
      });
      res.json(usuario);
    },
  };
}

module.exports = { crearUsuariosControlador };
