const fs = require('node:fs');
const path = require('node:path');

const DIRECTORIO_MIGRACIONES = __dirname;

function listarArchivosDeMigracion() {
  return fs
    .readdirSync(DIRECTORIO_MIGRACIONES)
    .filter((nombre) => nombre.endsWith('.sql'))
    .sort();
}

function asegurarTablaDeControl(conexion) {
  conexion.exec(`
    CREATE TABLE IF NOT EXISTS migraciones_aplicadas (
      nombre_archivo TEXT PRIMARY KEY,
      aplicada_en TEXT NOT NULL
    )
  `);
}

function migracionesYaAplicadas(conexion) {
  const filas = conexion.prepare('SELECT nombre_archivo FROM migraciones_aplicadas').all();
  return new Set(filas.map((fila) => fila.nombre_archivo));
}

function aplicarMigraciones(conexion) {
  asegurarTablaDeControl(conexion);
  const aplicadas = migracionesYaAplicadas(conexion);
  const pendientes = listarArchivosDeMigracion().filter((nombre) => !aplicadas.has(nombre));

  const registrarAplicada = conexion.prepare(
    'INSERT INTO migraciones_aplicadas (nombre_archivo, aplicada_en) VALUES (?, ?)'
  );

  for (const nombreArchivo of pendientes) {
    const sql = fs.readFileSync(path.join(DIRECTORIO_MIGRACIONES, nombreArchivo), 'utf8');
    // PRAGMA foreign_keys es un no-op dentro de una transacción — tiene que
    // desactivarse ACÁ AFUERA para que migraciones que recrean una tabla
    // (DROP TABLE + rename) no choquen con las FK de otras tablas que la
    // referencian. foreign_key_check adentro de la transacción compensa la
    // relajación: si la migración deja alguna violación de integridad
    // referencial, aborta antes de confirmar nada.
    conexion.pragma('foreign_keys = OFF');
    try {
      const transaccion = conexion.transaction(() => {
        conexion.exec(sql);
        const violaciones = conexion.pragma('foreign_key_check');
        if (violaciones.length > 0) {
          throw new Error(`Migración ${nombreArchivo} deja violaciones de integridad referencial: ${JSON.stringify(violaciones)}`);
        }
        registrarAplicada.run(nombreArchivo, new Date().toISOString());
      });
      transaccion();
    } finally {
      conexion.pragma('foreign_keys = ON');
    }
  }

  return pendientes;
}

if (require.main === module) {
  const { crearConexion } = require('../conexion');
  const conexion = crearConexion();
  const aplicadas = aplicarMigraciones(conexion);
  console.log(`Migraciones aplicadas: ${aplicadas.length ? aplicadas.join(', ') : 'ninguna pendiente'}`);
}

module.exports = { aplicarMigraciones };
