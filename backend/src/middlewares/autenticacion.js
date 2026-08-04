// Depende de un `usuariosServicio` con el método `obtenerUsuarioPorId(id)` —
// ese servicio todavía no existe, se construye en el módulo de autenticación
// (ver docs/decisiones.md, tarea de reciclaje). Esta factory ya queda lista
// para recibirlo por inyección de dependencias en cuanto exista.
function crearRequiereSesion({ usuariosServicio }) {
  return function requiereSesion(req, res, next) {
    if (!req.session || !req.session.usuarioId) {
      return res.status(401).json({ error: { codigo: 'NO_AUTENTICADO', mensaje: 'Se requiere iniciar sesión' } });
    }

    const usuario = usuariosServicio.obtenerUsuarioPorId(req.session.usuarioId);
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: { codigo: 'NO_AUTENTICADO', mensaje: 'Se requiere iniciar sesión' } });
    }

    req.usuario = { id: usuario.id, rol: usuario.rol };
    next();
  };
}

// Además de requerir sesión, exige que el rol del usuario autenticado esté
// en la lista permitida. Uso: requiereRol('admin', 'jefeDeCaja').
function crearRequiereRol(...rolesPermitidos) {
  return function requiereRol(req, res, next) {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: { codigo: 'NO_AUTORIZADO', mensaje: 'No tiene permiso para esta acción' } });
    }
    next();
  };
}

module.exports = { crearRequiereSesion, crearRequiereRol };
