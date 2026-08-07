function crearUsuariosRepositorio(conexion) {
  const insertar = conexion.prepare(`
    INSERT INTO usuarios (nombre_completo, correo, contrasena_hash, rol, activo, creado_en, creado_por)
    VALUES (@nombreCompleto, @correo, @contrasenaHash, @rol, 1, @creadoEn, @creadoPor)
  `);
  const actualizarStmt = conexion.prepare(`
    UPDATE usuarios SET nombre_completo = @nombreCompleto, correo = @correo, rol = @rol,
      actualizado_por = @actualizadoPor, actualizado_en = @actualizadoEn
    WHERE id = @id
  `);
  const cambiarEstadoStmt = conexion.prepare(`
    UPDATE usuarios SET activo = @activo, actualizado_por = @actualizadoPor, actualizado_en = @actualizadoEn
    WHERE id = @id
  `);
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
      creadoPor: fila.creado_por,
      actualizadoPor: fila.actualizado_por,
      actualizadoEn: fila.actualizado_en,
    };
  }

  function obtenerPorId(id) {
    return aDominio(buscarPorIdStmt.get(id));
  }

  return {
    crear({ nombreCompleto, correo, contrasenaHash, rol, usuarioId }) {
      const creadoEn = new Date().toISOString();
      const resultado = insertar.run({ nombreCompleto, correo, contrasenaHash, rol, creadoEn, creadoPor: usuarioId });
      return obtenerPorId(resultado.lastInsertRowid);
    },
    actualizar({ id, nombreCompleto, correo, rol, usuarioId }) {
      actualizarStmt.run({ id, nombreCompleto, correo, rol, actualizadoPor: usuarioId, actualizadoEn: new Date().toISOString() });
      return obtenerPorId(id);
    },
    cambiarEstado({ id, activo, usuarioId }) {
      cambiarEstadoStmt.run({ id, activo: activo ? 1 : 0, actualizadoPor: usuarioId, actualizadoEn: new Date().toISOString() });
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
