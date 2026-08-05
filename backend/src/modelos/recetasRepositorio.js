function crearRecetasRepositorio(conexion) {
  function agregarIngrediente({ platoId, ingredienteId, cantidadRequerida }) {
    conexion
      .prepare(
        `INSERT INTO plato_ingrediente (plato_id, ingrediente_id, cantidad_requerida)
         VALUES (?, ?, ?)`
      )
      .run(platoId, ingredienteId, cantidadRequerida);
  }

  function obtenerPorPlato(platoId) {
    return conexion
      .prepare('SELECT * FROM plato_ingrediente WHERE plato_id = ?')
      .all(platoId);
  }

  return { agregarIngrediente, obtenerPorPlato };
}

module.exports = { crearRecetasRepositorio };
