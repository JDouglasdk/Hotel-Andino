const bcrypt = require('bcryptjs');
const { ErrorDeNegocio } = require('../utilidades/errores');

// Mensaje deliberadamente genérico: no revelar si falló por correo
// inexistente, usuario inactivo o contraseña incorrecta.
function crearAutenticacionServicio({ usuariosRepositorio }) {
  function iniciarSesion({ correo, contrasena }) {
    const usuario = usuariosRepositorio.obtenerPorCorreo(correo);

    if (!usuario || !usuario.activo) {
      throw new ErrorDeNegocio('Correo o contraseña incorrectos', {
        codigo: 'CREDENCIALES_INVALIDAS',
        status: 401,
      });
    }

    const coincide = bcrypt.compareSync(contrasena, usuario.contrasena_hash);
    if (!coincide) {
      throw new ErrorDeNegocio('Correo o contraseña incorrectos', {
        codigo: 'CREDENCIALES_INVALIDAS',
        status: 401,
      });
    }

    return {
      id: usuario.id,
      nombreCompleto: usuario.nombre_completo,
      correo: usuario.correo,
      rol: usuario.rol,
    };
  }

  return { iniciarSesion };
}

module.exports = { crearAutenticacionServicio };
