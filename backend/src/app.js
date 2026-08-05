const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { crearConfigSesion } = require('./config/sesion');
const { entorno } = require('./config/entorno');
const { crearLimitadorGeneral } = require('./middlewares/limitadorGeneral');
const { crearLimitadorTiempo } = require('./middlewares/limitadorTiempo');
const { manejadorErrores } = require('./middlewares/manejadorErrores');
const { crearRequiereSesion, crearRequiereRol } = require('./middlewares/autenticacion');

const { crearAutenticacionControlador } = require('./controladores/autenticacionControlador');
const { crearUsuariosControlador } = require('./controladores/usuariosControlador');
const { crearCategoriasControlador } = require('./controladores/categoriasControlador');
const { crearHuespedesControlador } = require('./controladores/huespedesControlador');
const { crearIngredientesControlador } = require('./controladores/ingredientesControlador');
const { crearPlatosControlador } = require('./controladores/platosControlador');
const { crearPedidosControlador } = require('./controladores/pedidosControlador');
const { crearReportesControlador } = require('./controladores/reportesControlador');

const { crearRutasAutenticacion } = require('./rutas/autenticacion');
const { crearRutasUsuarios } = require('./rutas/usuarios');
const { crearRutasCategorias } = require('./rutas/categorias');
const { crearRutasHuespedes } = require('./rutas/huespedes');
const { crearRutasIngredientes } = require('./rutas/ingredientes');
const { crearRutasPlatos } = require('./rutas/platos');
const { crearRutasPedidos } = require('./rutas/pedidos');
const { crearRutasReportes } = require('./rutas/reportes');

function crearApp(contenedor, { rutaSesionesDb } = {}) {
  const app = express();
  app.set('trust proxy', entorno.confiarEnProxy);
  app.use(helmet());
  app.use(crearLimitadorTiempo(5000));
  app.use(express.json());
  app.use(session(crearConfigSesion(rutaSesionesDb)));
  app.use('/api', crearLimitadorGeneral());

  // ---------------------------------------------------------------------
  // Rutas de negocio: cada controlador recibe sus servicios desde el
  // contenedor; cada router recibe su controlador + los middlewares de
  // autenticación/autorización. Orden: auth primero (login no requiere
  // sesión), luego catálogo, luego comanda, luego reportes.
  // ---------------------------------------------------------------------
  const { servicios } = contenedor;

  const requiereSesion = crearRequiereSesion({ usuariosServicio: servicios.usuariosServicio });
  const requiereRol = crearRequiereRol;

  const autenticacionControlador = crearAutenticacionControlador({
    autenticacionServicio: servicios.autenticacionServicio,
  });
  const usuariosControlador = crearUsuariosControlador({ usuariosServicio: servicios.usuariosServicio });
  const categoriasControlador = crearCategoriasControlador({ categoriasServicio: servicios.categoriasServicio });
  const huespedesControlador = crearHuespedesControlador({
    huespedesServicio: servicios.huespedesServicio,
    pedidosServicio: servicios.pedidosServicio,
  });
  const ingredientesControlador = crearIngredientesControlador({
    ingredientesServicio: servicios.ingredientesServicio,
  });
  const platosControlador = crearPlatosControlador({ platosServicio: servicios.platosServicio });
  const pedidosControlador = crearPedidosControlador({ pedidosServicio: servicios.pedidosServicio });
  const reportesControlador = crearReportesControlador({ reportesServicio: servicios.reportesServicio });

  app.use('/api/auth', crearRutasAutenticacion({ controlador: autenticacionControlador, requiereSesion }));
  app.use(
    '/api/usuarios',
    crearRutasUsuarios({ controlador: usuariosControlador, requiereSesion, requiereRol })
  );
  app.use(
    '/api/categorias',
    crearRutasCategorias({ controlador: categoriasControlador, requiereSesion, requiereRol })
  );
  app.use(
    '/api/huespedes',
    crearRutasHuespedes({ controlador: huespedesControlador, requiereSesion, requiereRol })
  );
  app.use(
    '/api/ingredientes',
    crearRutasIngredientes({ controlador: ingredientesControlador, requiereSesion, requiereRol })
  );
  app.use('/api/platos', crearRutasPlatos({ controlador: platosControlador, requiereSesion, requiereRol }));
  app.use('/api/pedidos', crearRutasPedidos({ controlador: pedidosControlador, requiereSesion, requiereRol }));
  app.use(
    '/api/reportes',
    crearRutasReportes({ controlador: reportesControlador, requiereSesion, requiereRol })
  );

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
