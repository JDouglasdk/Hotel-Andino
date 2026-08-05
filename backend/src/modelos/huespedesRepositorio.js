// Repositorio de huéspedes. Recibe la conexión SQLite por parámetro (nunca
// hace `require` directo de `db/conexion.js`) para poder probarse con una
// conexión `:memory:`. Solo queries parametrizadas.
function crearHuespedesRepositorio(conexion) {
  function obtenerPorDocumento(documento) {
    return conexion
      .prepare('SELECT * FROM huespedes WHERE documento = ?')
      .get(documento);
  }

  function obtenerPorId(id) {
    return conexion.prepare('SELECT * FROM huespedes WHERE id = ?').get(id);
  }

  function crear({ documento, nombreCompleto, telefono, tipoHuesped }) {
    const resultado = conexion
      .prepare(
        `INSERT INTO huespedes (documento, nombre_completo, telefono, tipo_huesped)
         VALUES (?, ?, ?, ?)`
      )
      .run(documento, nombreCompleto, telefono ?? null, tipoHuesped);

    return obtenerPorId(resultado.lastInsertRowid);
  }

  function listarTodos() {
    return conexion
      .prepare('SELECT * FROM huespedes ORDER BY nombre_completo ASC')
      .all();
  }

  return { obtenerPorDocumento, obtenerPorId, crear, listarTodos };
}

module.exports = { crearHuespedesRepositorio };
