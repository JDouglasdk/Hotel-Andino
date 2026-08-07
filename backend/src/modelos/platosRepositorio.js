function crearPlatosRepositorio(conexion) {
  const insertar = conexion.prepare(`
    INSERT INTO platos (categoria_id, nombre, precio, informacion, disponible, creado_en, creado_por)
    VALUES (@categoriaId, @nombre, @precio, @informacion, 1, @creadoEn, @creadoPor)
  `);
  const actualizarStmt = conexion.prepare(`
    UPDATE platos SET categoria_id = @categoriaId, nombre = @nombre, precio = @precio, informacion = @informacion,
      actualizado_por = @actualizadoPor, actualizado_en = @actualizadoEn
    WHERE id = @id
  `);
  const cambiarDisponibilidadStmt = conexion.prepare(`
    UPDATE platos SET disponible = @disponible, actualizado_por = @actualizadoPor, actualizado_en = @actualizadoEn
    WHERE id = @id
  `);
  const buscarPorIdStmt = conexion.prepare('SELECT * FROM platos WHERE id = ?');

  function aDominio(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      categoriaId: fila.categoria_id,
      nombre: fila.nombre,
      precio: fila.precio,
      informacion: fila.informacion,
      disponible: Boolean(fila.disponible),
      creadoEn: fila.creado_en,
      creadoPor: fila.creado_por,
      actualizadoPor: fila.actualizado_por,
      actualizadoEn: fila.actualizado_en,
    };
  }

  function obtenerPorId(id) {
    return aDominio(buscarPorIdStmt.get(id));
  }

  return {
    crear({ categoriaId, nombre, precio, informacion, usuarioId }) {
      const creadoEn = new Date().toISOString();
      const resultado = insertar.run({ categoriaId, nombre, precio, informacion: informacion ?? null, creadoEn, creadoPor: usuarioId });
      return obtenerPorId(resultado.lastInsertRowid);
    },
    actualizar({ id, categoriaId, nombre, precio, informacion, usuarioId }) {
      actualizarStmt.run({
        id, categoriaId, nombre, precio, informacion: informacion ?? null,
        actualizadoPor: usuarioId, actualizadoEn: new Date().toISOString(),
      });
      return obtenerPorId(id);
    },
    cambiarDisponibilidad({ id, disponible, usuarioId }) {
      cambiarDisponibilidadStmt.run({ id, disponible: disponible ? 1 : 0, actualizadoPor: usuarioId, actualizadoEn: new Date().toISOString() });
      return obtenerPorId(id);
    },
    buscarPorId(id) {
      return obtenerPorId(id);
    },
    listar({ categoriaId, disponible } = {}) {
      const condiciones = [];
      const valores = {};
      if (categoriaId !== undefined) {
        condiciones.push('categoria_id = @categoriaId');
        valores.categoriaId = categoriaId;
      }
      if (disponible !== undefined) {
        condiciones.push('disponible = @disponible');
        valores.disponible = disponible ? 1 : 0;
      }
      const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
      const filas = conexion.prepare(`SELECT * FROM platos ${where} ORDER BY nombre`).all(valores);
      return filas.map(aDominio);
    },
  };
}

module.exports = { crearPlatosRepositorio };
