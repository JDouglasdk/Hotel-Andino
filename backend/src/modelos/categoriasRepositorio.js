function crearCategoriasRepositorio(conexion) {
  const insertar = conexion.prepare('INSERT INTO categorias (nombre) VALUES (@nombre)');
  const actualizar = conexion.prepare('UPDATE categorias SET nombre = @nombre WHERE id = @id');
  const buscarPorIdStmt = conexion.prepare('SELECT * FROM categorias WHERE id = ?');
  const buscarPorNombreStmt = conexion.prepare('SELECT * FROM categorias WHERE nombre = ? COLLATE NOCASE');
  const listarTodasStmt = conexion.prepare('SELECT * FROM categorias ORDER BY nombre COLLATE NOCASE');

  function aDominio(fila) {
    if (!fila) return null;
    return { id: fila.id, nombre: fila.nombre };
  }

  function obtenerPorId(id) {
    return aDominio(buscarPorIdStmt.get(id));
  }

  return {
    crear({ nombre }) {
      const resultado = insertar.run({ nombre });
      return obtenerPorId(resultado.lastInsertRowid);
    },
    actualizar({ id, nombre }) {
      actualizar.run({ id, nombre });
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
