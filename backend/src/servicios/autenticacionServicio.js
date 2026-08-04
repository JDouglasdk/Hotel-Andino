const bcrypt = require('bcryptjs');
const { ErrorDeNegocio } = require('../utilidades/errores');

const RONDAS_DE_SAL = 10;
const MENSAJE_CREDENCIALES_INVALIDAS = 'Correo o contraseña incorrectos';

// Hash de relleno usado cuando el usuario no existe o está inactivo, para que
// bcrypt.compareSync siempre se ejecute contra un hash real y la duración de
// la operación no delate (por temporización) si el correo existe o no.
const HASH_DE_RELLENO = bcrypt.hashSync('valor-de-relleno-para-comparacion-constante', RONDAS_DE_SAL);

function crearAutenticacionServicio({ usuariosRepositorio }) {
  return {
    hashearContrasena(contrasenaEnClaro) {
      return bcrypt.hashSync(contrasenaEnClaro, RONDAS_DE_SAL);
    },

    verificarCredenciales({ correo, contrasena }) {
      const usuario = usuariosRepositorio.buscarPorCorreo(correo);
      const usuarioValido = Boolean(usuario) && usuario.activo;
      const hashParaComparar = usuarioValido ? usuario.contrasenaHash : HASH_DE_RELLENO;

      // Siempre se ejecuta bcrypt.compareSync (contra el hash real o el de
      // relleno) para que el tiempo de respuesta no varíe según si el correo
      // existe, está activo, o la contraseña es incorrecta. Cualquier error
      // (por ejemplo, una contraseña que no sea texto) también colapsa a la
      // misma respuesta controlada en lugar de escapar como excepción cruda.
      let contrasenaCoincide = false;
      try {
        contrasenaCoincide = typeof contrasena === 'string' && bcrypt.compareSync(contrasena, hashParaComparar);
      } catch {
        contrasenaCoincide = false;
      }

      const credencialesValidas = usuarioValido && contrasenaCoincide;

      if (!credencialesValidas) {
        throw new ErrorDeNegocio(MENSAJE_CREDENCIALES_INVALIDAS, { codigo: 'CREDENCIALES_INVALIDAS', status: 401 });
      }

      const { contrasenaHash, ...usuarioSinContrasena } = usuario;
      return usuarioSinContrasena;
    },
  };
}

module.exports = { crearAutenticacionServicio };
