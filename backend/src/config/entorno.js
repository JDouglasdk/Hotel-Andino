require('dotenv').config();

function obtenerVariable(nombre, porDefecto) {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') {
    if (porDefecto !== undefined) return porDefecto;
    throw new Error(`Falta la variable de entorno requerida: ${nombre}`);
  }
  return valor;
}

const entorno = {
  puerto: Number(obtenerVariable('PUERTO', '3000')),
  rutaBaseDatos: obtenerVariable('RUTA_BASE_DATOS', './datos/hotel.db'),
  entornoNodo: obtenerVariable('NODE_ENV', 'development'),
  secretoSesion: obtenerVariable('SECRETO_SESION', 'secreto-de-desarrollo-cambiar-en-produccion'),
  rutaSesionesDb: obtenerVariable('RUTA_SESIONES_DB', './datos/sesiones.db'),
  confiarEnProxy: obtenerVariable('CONFIAR_EN_PROXY', 'false') === 'true',
};

module.exports = { entorno };
