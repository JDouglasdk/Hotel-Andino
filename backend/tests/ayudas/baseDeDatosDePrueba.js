const { crearConexion } = require('../../src/db/conexion');
const { aplicarMigraciones } = require('../../src/db/migraciones/migrar');

function crearBaseDeDatosDePrueba() {
  const conexion = crearConexion(':memory:');
  aplicarMigraciones(conexion);
  return conexion;
}

module.exports = { crearBaseDeDatosDePrueba };
