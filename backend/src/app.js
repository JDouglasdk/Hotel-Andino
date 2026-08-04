const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const timeout = require('connect-timeout');
const { crearConfigSesion } = require('./config/sesion');
const { entorno } = require('./config/entorno');
const { crearLimitadorGeneral } = require('./middlewares/limitadorGeneral');
const { manejadorErrores } = require('./middlewares/manejadorErrores');

function crearApp(contenedor, { rutaSesionesDb } = {}) { // eslint-disable-line no-unused-vars
  const app = express();
  app.set('trust proxy', entorno.confiarEnProxy);
  app.use(helmet());
  app.use(timeout('5s'));
  app.use(express.json());
  app.use(session(crearConfigSesion(rutaSesionesDb)));
  app.use('/api', crearLimitadorGeneral());

  // ---------------------------------------------------------------------
  // Las rutas de negocio se montan aquí. Orden sugerido para mañana (ver
  // docs/decisiones.md para el reparto entre las dos personas del equipo):
  //
  //   const requiereSesion = crearRequiereSesion({ usuariosServicio: contenedor.servicios.usuariosServicio });
  //   app.use('/api/auth', crearRutasAutenticacion({ controlador: ..., requiereSesion }));
  //   app.use('/api/huespedes', crearRutasHuespedes({ ... }));
  //   app.use('/api/categorias', crearRutasCategorias({ ... }));
  //   app.use('/api/platos', crearRutasPlatos({ ... }));
  //   app.use('/api/ingredientes', crearRutasIngredientes({ ... }));
  //   app.use('/api/pedidos', crearRutasPedidos({ ... }));
  //   app.use('/api/reportes', crearRutasReportes({ ... })); // incluye caja diaria
  // ---------------------------------------------------------------------

  const publicDir = path.join(__dirname, '../../frontend/public');
  app.use(express.static(publicDir));

  app.get('/login', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
  ['admin', 'mesero', 'cocina', 'jefeDeCaja'].forEach((rol) => {
    app.get(new RegExp(`^/${rol}(/.*)?$`), (req, res) => res.sendFile(path.join(publicDir, `${rol}.html`)));
  });
  app.get('/', (req, res) => res.redirect('/login'));

  app.use((req, res) => {
    res.status(404).json({ error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'Ruta no encontrada' } });
  });

  app.use(manejadorErrores);

  return app;
}

module.exports = { crearApp };
