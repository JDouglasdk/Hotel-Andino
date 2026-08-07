function crearCategoriasRepositorio(conexion) {
  const insertar = conexion.prepare(`
    INSERT INTO categorias (nombre, creado_por, creado_en) VALUES (@nombre, @creadoPor, @creadoEn)
  `);
  const actualizarStmt = conexion.prepare(`
    UPDATE categorias SET nombre = @nombre, actualizado_por = @actualizadoPor, actualizado_en = @actualizadoEn
    WHERE id = @id
  `);
  const buscarPorIdStmt = conexion.prepare('SELECT * FROM categorias WHERE id = ?');
  const buscarPorNombreStmt = conexion.prepare('SELECT * FROM categorias WHERE nombre = ? COLLATE NOCASE');
  const listarTodasStmt = conexion.prepare('SELECT * FROM categorias ORDER BY nombre COLLATE NOCASE');

  function aDominio(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      nombre: fila.nombre,
      creadoPor: fila.creado_por,
      creadoEn: fila.creado_en,
      actualizadoPor: fila.actualizado_por,
      actualizadoEn: fila.actualizado_en,
    };
  }

  function obtenerPorId(id) {
    return aDominio(buscarPorIdStmt.get(id));
  }

  return {
    crear({ nombre, usuarioId }) {
      const creadoEn = new Date().toISOString();
      const resultado = insertar.run({ nombre, creadoPor: usuarioId, creadoEn });
      return obtenerPorId(resultado.lastInsertRowid);
    },
    actualizar({ id, nombre, usuarioId }) {
      actualizarStmt.run({ id, nombre, actualizadoPor: usuarioId, actualizadoEn: new Date().toISOString() });
      return obtenerPorId(id);
    },
    buscarPorId(id) {
      return obtenerPorId(id);
    },
    buscarPorNombre(nombre) {
      return aDominio(buscarPorNombreStmt.get(nombre));
    },
    listarTodas() {
      return listarTodasStmt.all().map(aDominio);
    },
  };
}

module.exports = { crearCategoriasRepositorio };
