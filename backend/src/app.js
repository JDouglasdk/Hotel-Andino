const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const timeout = require('connect-timeout');
const { crearConfigSesion } = require('./config/sesion');
const { entorno } = require('./config/entorno');
const { crearRequiereSesion } = require('./middlewares/autenticacion');
const { crearLimitadorGeneral } = require('./middlewares/limitadorGeneral');
const { manejadorErrores } = require('./middlewares/manejadorErrores');
const { crearAutenticacionControlador } = require('./controladores/autenticacionControlador');
const { crearRutasAutenticacion } = require('./rutas/autenticacion');
const { crearUsuariosControlador } = require('./controladores/usuariosControlador');
const { crearRutasUsuarios } = require('./rutas/usuarios');

function crearApp(contenedor, { rutaSesionesDb } = {}) {
  const app = express();
  app.set('trust proxy', entorno.confiarEnProxy);
  app.use(helmet());
  app.use(timeout('5s'));
  app.use(express.json());
  app.use(session(crearConfigSesion(rutaSesionesDb)));
  app.use('/api', crearLimitadorGeneral());

  const requiereSesion = crearRequiereSesion({ usuariosServicio: contenedor.servicios.usuariosServicio });

  const autenticacionControlador = crearAutenticacionControlador({
    autenticacionServicio: contenedor.servicios.autenticacionServicio,
    usuariosServicio: contenedor.servicios.usuariosServicio,
  });
  app.use('/api/auth', crearRutasAutenticacion({ controlador: autenticacionControlador, requiereSesion }));

  const usuariosControlador = crearUsuariosControlador({ usuariosServicio: contenedor.servicios.usuariosServicio });
  app.use('/api/usuarios', crearRutasUsuarios({ controlador: usuariosControlador, requiereSesion }));

  // ---------------------------------------------------------------------
  // Rutas de negocio que faltan (ver docs/decisiones.md — reparto entre
  // las dos personas del equipo):
  //
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
