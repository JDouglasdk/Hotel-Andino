function crearRecetasRepositorio(conexion) {
  const eliminarPorPlatoStmt = conexion.prepare('DELETE FROM plato_ingrediente WHERE plato_id = ?');
  const insertarStmt = conexion.prepare(`
    INSERT INTO plato_ingrediente (plato_id, ingrediente_id, cantidad_requerida)
    VALUES (@platoId, @ingredienteId, @cantidadRequerida)
  `);
  const obtenerPorPlatoStmt = conexion.prepare('SELECT * FROM plato_ingrediente WHERE plato_id = ?');

  function aDominio(fila) {
    return {
      platoId: fila.plato_id,
      ingredienteId: fila.ingrediente_id,
      cantidadRequerida: fila.cantidad_requerida,
    };
  }

  const reemplazar = conexion.transaction(({ platoId, items }) => {
    eliminarPorPlatoStmt.run(platoId);
    for (const item of items) {
      insertarStmt.run({ platoId, ingredienteId: item.ingredienteId, cantidadRequerida: item.cantidadRequerida });
    }
  });

  return {
    reemplazarPorPlato({ platoId, items }) {
      reemplazar({ platoId, items });
    },
    obtenerPorPlato(platoId) {
      return obtenerPorPlatoStmt.all(platoId).map(aDominio);
    },
  };
}

module.exports = { crearRecetasRepositorio };
