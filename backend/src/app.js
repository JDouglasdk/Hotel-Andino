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
const { crearCategoriasControlador } = require('./controladores/categoriasControlador');
const { crearRutasCategorias } = require('./rutas/categorias');
const { crearPlatosControlador } = require('./controladores/platosControlador');
const { crearRutasPlatos } = require('./rutas/platos');
const { crearHuespedesControlador } = require('./controladores/huespedesControlador');
const { crearRutasHuespedes } = require('./rutas/huespedes');
const { crearPedidosControlador } = require('./controladores/pedidosControlador');
const { crearRutasPedidos } = require('./rutas/pedidos');
const { crearIngredientesControlador } = require('./controladores/ingredientesControlador');
const { crearRutasIngredientes } = require('./rutas/ingredientes');
const { crearReportesControlador } = require('./controladores/reportesControlador');
const { crearRutasReportes } = require('./rutas/reportes');

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

  const categoriasControlador = crearCategoriasControlador({ categoriasServicio: contenedor.servicios.categoriasServicio });
  app.use('/api/categorias', crearRutasCategorias({ controlador: categoriasControlador, requiereSesion }));

  const platosControlador = crearPlatosControlador({ platosServicio: contenedor.servicios.platosServicio });
  app.use('/api/platos', crearRutasPlatos({ controlador: platosControlador, requiereSesion }));

  const huespedesControlador = crearHuespedesControlador({ huespedesServicio: contenedor.servicios.huespedesServicio });
  app.use('/api/huespedes', crearRutasHuespedes({ controlador: huespedesControlador, requiereSesion }));

  const pedidosControlador = crearPedidosControlador({ pedidosServicio: contenedor.servicios.pedidosServicio });
  app.use('/api/pedidos', crearRutasPedidos({ controlador: pedidosControlador, requiereSesion }));

  const ingredientesControlador = crearIngredientesControlador({ ingredientesServicio: contenedor.servicios.ingredientesServicio });
  app.use('/api/ingredientes', crearRutasIngredientes({ controlador: ingredientesControlador, requiereSesion }));

  const reportesControlador = crearReportesControlador({ reportesServicio: contenedor.servicios.reportesServicio });
  app.use('/api/reportes', crearRutasReportes({ controlador: reportesControlador, requiereSesion }));

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
