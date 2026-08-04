function crearUsuarioDePrueba(contenedor, { nombreCompleto, correo, contrasena, rol }) {
  return contenedor.servicios.usuariosServicio.crearUsuario({ nombreCompleto, correo, contrasena, rol });
}

module.exports = { crearUsuarioDePrueba };
