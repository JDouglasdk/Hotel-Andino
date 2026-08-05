function crearPlatosRepositorio(conexion) {
  function obtenerPorId(id) {
    return conexion.prepare('SELECT * FROM platos WHERE id = ?').get(id);
  }

  function crear({ categoriaId, nombre, precio, informacion }) {
    const resultado = conexion
      .prepare(
        `INSERT INTO platos (categoria_id, nombre, precio, informacion)
         VALUES (?, ?, ?, ?)`
      )
      .run(categoriaId, nombre, precio, informacion ?? null);
    return obtenerPorId(resultado.lastInsertRowid);
  }

  function listarTodos() {
    return conexion
      .prepare('SELECT * FROM platos WHERE disponible = 1 ORDER BY nombre ASC')
      .all();
  }

  return { obtenerPorId, crear, listarTodos };
}

module.exports = { crearPlatosRepositorio };
