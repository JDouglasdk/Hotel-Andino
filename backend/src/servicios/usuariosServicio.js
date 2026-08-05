const bcrypt = require('bcryptjs');
const { ErrorDeNegocio, ErrorNoEncontrado } = require('../utilidades/errores');

const ROLES_VALIDOS = ['admin', 'mesero', 'cocina', 'jefeDeCaja'];
const RONDAS_BCRYPT = 10;

// `obtenerUsuarioPorId` es el contrato que consume
// `middlewares/autenticacion.js` (crearRequiereSesion) — debe devolver el
// usuario crudo (con `activo`) o `undefined`/`null` si no existe.
function crearUsuariosServicio({ usuariosRepositorio }) {
  function quitarHash(usuario) {
    if (!usuario) return usuario;
    const { contrasena_hash, ...resto } = usuario; // eslint-disable-line no-unused-vars
    return resto;
  }

  function obtenerUsuarioPorId(id) {
    return usuariosRepositorio.obtenerPorId(id);
  }

  function obtenerPorIdSinHash(id) {
    const usuario = usuariosRepositorio.obtenerPorId(id);
    if (!usuario) {
      throw new ErrorNoEncontrado('No existe un usuario con ese id');
    }
    return quitarHash(usuario);
  }

  function crearUsuario({ nombreCompleto, correo, contrasena, rol }) {
    if (!ROLES_VALIDOS.includes(rol)) {
      throw new ErrorDeNegocio('Rol inválido', { codigo: 'ROL_INVALIDO' });
    }

    const existente = usuariosRepositorio.obtenerPorCorreo(correo);
    if (existente) {
      throw new ErrorDeNegocio('Ya existe un usuario registrado con ese correo', {
        codigo: 'CORREO_DUPLICADO',
        status: 409,
      });
    }

    const contrasenaHash = bcrypt.hashSync(contrasena, RONDAS_BCRYPT);
    const usuario = usuariosRepositorio.crear({ nombreCompleto, correo, contrasenaHash, rol });
    return quitarHash(usuario);
  }

  function listarTodos() {
    return usuariosRepositorio.listarTodos().map(quitarHash);
  }

  return { obtenerUsuarioPorId, obtenerPorIdSinHash, crearUsuario, listarTodos };
}

module.exports = { crearUsuariosServicio, ROLES_VALIDOS };
