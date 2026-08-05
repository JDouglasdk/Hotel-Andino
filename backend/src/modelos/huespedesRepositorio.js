function crearHuespedesRepositorio(conexion) {
  const insertar = conexion.prepare(`
    INSERT INTO huespedes (documento, nombre_completo, telefono, tipo_huesped, creado_en)
    VALUES (@documento, @nombreCompleto, @telefono, @tipoHuesped, @creadoEn)
  `);
  const buscarPorIdStmt = conexion.prepare('SELECT * FROM huespedes WHERE id = ?');
  const buscarPorDocumentoStmt = conexion.prepare('SELECT * FROM huespedes WHERE documento = ?');

  function aDominio(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      documento: fila.documento,
      nombreCompleto: fila.nombre_completo,
      telefono: fila.telefono,
      tipoHuesped: fila.tipo_huesped,
      creadoEn: fila.creado_en,
    };
  }

  function obtenerPorId(id) {
    return aDominio(buscarPorIdStmt.get(id));
  }

  return {
    crear({ documento, nombreCompleto, telefono, tipoHuesped }) {
      const creadoEn = new Date().toISOString();
      const resultado = insertar.run({ documento, nombreCompleto, telefono: telefono ?? null, tipoHuesped, creadoEn });
      return obtenerPorId(resultado.lastInsertRowid);
    },
    buscarPorId(id) {
      return obtenerPorId(id);
    },
    buscarPorDocumento(documento) {
      return aDominio(buscarPorDocumentoStmt.get(documento));
    },
  };
}

module.exports = { crearHuespedesRepositorio };
