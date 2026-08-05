function crearIngredientesRepositorio(conexion) {
  function obtenerPorId(id) {
    return conexion.prepare('SELECT * FROM ingredientes WHERE id = ?').get(id);
  }

  function obtenerPorNombre(nombre) {
    return conexion.prepare('SELECT * FROM ingredientes WHERE nombre = ?').get(nombre);
  }

  function crear({ nombre, cantidadStock, unidadMedida }) {
    const resultado = conexion
      .prepare(
        `INSERT INTO ingredientes (nombre, cantidad_stock, unidad_medida)
         VALUES (?, ?, ?)`
      )
      .run(nombre, cantidadStock, unidadMedida);
    return obtenerPorId(resultado.lastInsertRowid);
  }

  function listarTodos() {
    return conexion.prepare('SELECT * FROM ingredientes ORDER BY nombre ASC').all();
  }

  // "Edición de stock": establece un valor absoluto en inventario (p. ej.
  // tras un reabastecimiento o un conteo físico). A diferencia de
  // `descontarStockSiHay`, no es incremental ni condicionado — para
  // descuentos por venta usar esa otra función.
  function actualizarStock(id, cantidadStock) {
    conexion
      .prepare(
        `UPDATE ingredientes
         SET cantidad_stock = ?, actualizado_en = datetime('now')
         WHERE id = ?`
      )
      .run(cantidadStock, id);
    return obtenerPorId(id);
  }

  // Descuento condicionado en el propio UPDATE: solo resta si hay stock
  // suficiente, así se evita una condición de carrera entre "leer stock" y
  // "escribir stock" con dos comandas concurrentes sobre el mismo
  // ingrediente. Devuelve el número de filas afectadas (0 = no había stock
  // suficiente al momento de ejecutar el UPDATE).
  function descontarStockSiHay(id, cantidad) {
    const resultado = conexion
      .prepare(
        `UPDATE ingredientes
         SET cantidad_stock = cantidad_stock - ?, actualizado_en = datetime('now')
         WHERE id = ? AND cantidad_stock >= ?`
      )
      .run(cantidad, id, cantidad);
    return resultado.changes;
  }

  return { obtenerPorId, obtenerPorNombre, crear, actualizarStock, listarTodos, descontarStockSiHay };
}

module.exports = { crearIngredientesRepositorio };
