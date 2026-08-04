function crearUsuariosRepositorio(conexion) {
  const insertar = conexion.prepare(`
    INSERT INTO usuarios (nombre_completo, correo, contrasena_hash, rol, activo, creado_en)
    VALUES (@nombreCompleto, @correo, @contrasenaHash, @rol, 1, @creadoEn)
  `);
  const actualizar = conexion.prepare(`
    UPDATE usuarios SET nombre_completo = @nombreCompleto, correo = @correo, rol = @rol WHERE id = @id
  `);
  const cambiarEstado = conexion.prepare('UPDATE usuarios SET activo = @activo WHERE id = @id');
  const buscarPorIdStmt = conexion.prepare('SELECT * FROM usuarios WHERE id = ?');
  const buscarPorCorreoStmt = conexion.prepare('SELECT * FROM usuarios WHERE correo = ?');
  const listarTodosStmt = conexion.prepare('SELECT * FROM usuarios ORDER BY nombre_completo');

  function aDominio(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      nombreCompleto: fila.nombre_completo,
      correo: fila.correo,
      contrasenaHash: fila.contrasena_hash,
      rol: fila.rol,
      activo: Boolean(fila.activo),
      creadoEn: fila.creado_en,
    };
  }

  function obtenerPorId(id) {
    return aDominio(buscarPorIdStmt.get(id));
  }

  return {
    crear({ nombreCompleto, correo, contrasenaHash, rol }) {
      const creadoEn = new Date().toISOString();
      const resultado = insertar.run({ nombreCompleto, correo, contrasenaHash, rol, creadoEn });
      return obtenerPorId(resultado.lastInsertRowid);
    },
    actualizar({ id, nombreCompleto, correo, rol }) {
      actualizar.run({ id, nombreCompleto, correo, rol });
      return obtenerPorId(id);
    },
    cambiarEstado({ id, activo }) {
      cambiarEstado.run({ id, activo: activo ? 1 : 0 });
      return obtenerPorId(id);
    },
    buscarPorId(id) {
      return obtenerPorId(id);
    },
    buscarPorCorreo(correo) {
      return aDominio(buscarPorCorreoStmt.get(correo));
    },
    listarTodos() {
      return listarTodosStmt.all().map(aDominio);
    },
  };
}

module.exports = { crearUsuariosRepositorio };
