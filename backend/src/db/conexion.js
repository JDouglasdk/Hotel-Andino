const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');
const { entorno } = require('../config/entorno');

function crearConexion(rutaBaseDatos = entorno.rutaBaseDatos) {
  if (rutaBaseDatos !== ':memory:') {
    const directorio = path.dirname(rutaBaseDatos);
    fs.mkdirSync(directorio, { recursive: true });
  }
  const conexion = new Database(rutaBaseDatos);
  conexion.pragma('foreign_keys = ON');
  return conexion;
}

module.exports = { crearConexion };
