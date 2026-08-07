function crearIngredientesRepositorio(conexion) {
  const insertar = conexion.prepare(`
    INSERT INTO ingredientes (nombre, cantidad_stock, unidad_medida, actualizado_en)
    VALUES (@nombre, @cantidadStock, @unidadMedida, @actualizadoEn)
  `);
  const incrementarStockStmt = conexion.prepare(`
    UPDATE ingredientes SET cantidad_stock = cantidad_stock + @delta, actualizado_en = @actualizadoEn
    WHERE id = @id AND cantidad_stock + @delta >= 0
  `);
  const buscarPorIdStmt = conexion.prepare('SELECT * FROM ingredientes WHERE id = ?');
  const buscarPorNombreStmt = conexion.prepare('SELECT * FROM ingredientes WHERE nombre = ?');
  const listarTodosStmt = conexion.prepare('SELECT * FROM ingredientes ORDER BY nombre');

  function aDominio(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      nombre: fila.nombre,
      cantidadStock: fila.cantidad_stock,
      unidadMedida: fila.unidad_medida,
      actualizadoEn: fila.actualizado_en,
    };
  }

  function obtenerPorId(id) {
    return aDominio(buscarPorIdStmt.get(id));
  }

  return {
    crear({ nombre, cantidadStock, unidadMedida }) {
      const actualizadoEn = new Date().toISOString();
      const resultado = insertar.run({ nombre, cantidadStock, unidadMedida, actualizadoEn });
      return obtenerPorId(resultado.lastInsertRowid);
    },
    // Único punto de escritura de stock: delta positivo entra, negativo
    // sale. Atómico vía el WHERE (evita condición de carrera entre leer y
    // escribir) — reemplaza los antiguos actualizarStock/descontarStockSiHay,
    // que hacían lo mismo con dos statements casi idénticos.
    incrementarStock({ id, delta }) {
      const resultado = incrementarStockStmt.run({ id, delta, actualizadoEn: new Date().toISOString() });
      return resultado.changes;
    },
    buscarPorId(id) {
      return obtenerPorId(id);
    },
    buscarPorNombre(nombre) {
      return aDominio(buscarPorNombreStmt.get(nombre));
    },
    listarTodos() {
      return listarTodosStmt.all().map(aDominio);
    },
  };
}

module.exports = { crearIngredientesRepositorio };
