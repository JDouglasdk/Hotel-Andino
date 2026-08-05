function crearPlatosRepositorio(conexion) {
  const insertar = conexion.prepare(`
    INSERT INTO platos (categoria_id, nombre, precio, informacion, disponible, creado_en)
    VALUES (@categoriaId, @nombre, @precio, @informacion, 1, @creadoEn)
  `);
  const actualizar = conexion.prepare(`
    UPDATE platos SET categoria_id = @categoriaId, nombre = @nombre, precio = @precio, informacion = @informacion WHERE id = @id
  `);
  const cambiarDisponibilidad = conexion.prepare('UPDATE platos SET disponible = @disponible WHERE id = @id');
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
    };
  }

  function obtenerPorId(id) {
    return aDominio(buscarPorIdStmt.get(id));
  }

  return {
    crear({ categoriaId, nombre, precio, informacion }) {
      const creadoEn = new Date().toISOString();
      const resultado = insertar.run({ categoriaId, nombre, precio, informacion: informacion ?? null, creadoEn });
      return obtenerPorId(resultado.lastInsertRowid);
    },
    actualizar({ id, categoriaId, nombre, precio, informacion }) {
      actualizar.run({ id, categoriaId, nombre, precio, informacion: informacion ?? null });
      return obtenerPorId(id);
    },
    cambiarDisponibilidad({ id, disponible }) {
      cambiarDisponibilidad.run({ id, disponible: disponible ? 1 : 0 });
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
