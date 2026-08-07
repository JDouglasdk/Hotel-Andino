const { ErrorDeNegocio, ErrorNoEncontrado } = require('../utilidades/errores');

// Debe coincidir exactamente con el CHECK de la columna `rol` en
// backend/src/db/migraciones/001_crear_usuarios.sql — si se agrega un rol
// nuevo, se cambia en los dos lugares.
const ROLES_VALIDOS = ['admin', 'mesero', 'cocina', 'jefeDeCaja'];

function quitarContrasena(usuario) {
  if (!usuario) return usuario;
  const { contrasenaHash, ...resto } = usuario;
  return resto;
}

function validarRol(rol) {
  if (!ROLES_VALIDOS.includes(rol)) {
    throw new ErrorDeNegocio(`Rol inválido: ${rol}`, { codigo: 'ROL_INVALIDO', status: 422 });
  }
}

function crearUsuariosServicio({ usuariosRepositorio, autenticacionServicio }) {
  return {
    crearUsuario({ nombreCompleto, correo, contrasena, rol, usuarioId }) {
      validarRol(rol);
      if (usuariosRepositorio.buscarPorCorreo(correo)) {
        throw new ErrorDeNegocio(`Ya existe un usuario con el correo ${correo}`, { codigo: 'CORREO_DUPLICADO', status: 409 });
      }
      const contrasenaHash = autenticacionServicio.hashearContrasena(contrasena);
      return quitarContrasena(usuariosRepositorio.crear({ nombreCompleto, correo, contrasenaHash, rol, usuarioId }));
    },

    actualizarUsuario({ id, nombreCompleto, correo, rol, usuarioId }) {
      validarRol(rol);
      if (!usuariosRepositorio.buscarPorId(id)) {
        throw new ErrorNoEncontrado(`El usuario ${id} no existe`);
      }
      return quitarContrasena(usuariosRepositorio.actualizar({ id, nombreCompleto, correo, rol, usuarioId }));
    },

    cambiarEstadoUsuario({ id, activo, usuarioId }) {
      if (!usuariosRepositorio.buscarPorId(id)) {
        throw new ErrorNoEncontrado(`El usuario ${id} no existe`);
      }
      return quitarContrasena(usuariosRepositorio.cambiarEstado({ id, activo, usuarioId }));
    },

    listarUsuarios() {
      return usuariosRepositorio.listarTodos().map(quitarContrasena);
    },

    obtenerUsuarioPorId(id) {
      return quitarContrasena(usuariosRepositorio.buscarPorId(id));
    },
  };
}

module.exports = { crearUsuariosServicio };
