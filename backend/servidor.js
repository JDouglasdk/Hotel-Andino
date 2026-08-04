const { crearConexion } = require('./src/db/conexion');
const { aplicarMigraciones } = require('./src/db/migraciones/migrar');
const { crearContenedor } = require('./src/contenedor');
const { crearApp } = require('./src/app');
const { entorno } = require('./src/config/entorno');
const { logger } = require('./src/utilidades/logger');

const conexion = crearConexion();
aplicarMigraciones(conexion);
const contenedor = crearContenedor(conexion);
const app = crearApp(contenedor);

app.listen(entorno.puerto, () => {
  logger.info(`Servidor escuchando en el puerto ${entorno.puerto}`);
});
