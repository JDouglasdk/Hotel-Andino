function crearCategoriasRepositorio(conexion) {
  function obtenerPorId(id) {
    return conexion.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
  }

  function obtenerPorNombre(nombre) {
    return conexion.prepare('SELECT * FROM categorias WHERE nombre = ?').get(nombre);
  }

  function crear({ nombre }) {
    const resultado = conexion.prepare('INSERT INTO categorias (nombre) VALUES (?)').run(nombre);
    return obtenerPorId(resultado.lastInsertRowid);
  }

  function listarTodas() {
    return conexion.prepare('SELECT * FROM categorias ORDER BY nombre ASC').all();
  }

  return { obtenerPorId, obtenerPorNombre, crear, listarTodas };
}

module.exports = { crearCategoriasRepositorio };
