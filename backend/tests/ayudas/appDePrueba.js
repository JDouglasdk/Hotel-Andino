const { crearBaseDeDatosDePrueba } = require('./baseDeDatosDePrueba');
const { crearContenedor } = require('../../src/contenedor');
const { crearApp } = require('../../src/app');

function crearAppDePrueba() {
  const conexion = crearBaseDeDatosDePrueba();
  const contenedor = crearContenedor(conexion);
  const app = crearApp(contenedor, { rutaSesionesDb: ':memory:' });
  return { app, conexion, contenedor };
}

module.exports = { crearAppDePrueba };
