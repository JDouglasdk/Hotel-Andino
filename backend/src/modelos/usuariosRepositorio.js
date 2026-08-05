function crearUsuariosRepositorio(conexion) {
  function obtenerPorId(id) {
    return conexion.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  }

  function obtenerPorCorreo(correo) {
    return conexion.prepare('SELECT * FROM usuarios WHERE correo = ?').get(correo);
  }

  function crear({ nombreCompleto, correo, contrasenaHash, rol }) {
    const resultado = conexion
      .prepare(
        `INSERT INTO usuarios (nombre_completo, correo, contrasena_hash, rol)
         VALUES (?, ?, ?, ?)`
      )
      .run(nombreCompleto, correo, contrasenaHash, rol);

    return obtenerPorId(resultado.lastInsertRowid);
  }

  function listarTodos() {
    return conexion.prepare('SELECT * FROM usuarios ORDER BY nombre_completo ASC').all();
  }

  return { obtenerPorId, obtenerPorCorreo, crear, listarTodos };
}

module.exports = { crearUsuariosRepositorio };
