// Contenedor de inyección de dependencias. Patrón reciclado de
// restaurante-app: cada repositorio se construye a partir de la conexión a
// BD, cada servicio recibe los repositorios (y otros servicios) que necesita
// por parámetro — nunca hace `require` directo de un repositorio. Así la
// lógica de negocio en servicios/ no depende de cómo se conecta a SQLite.

const { crearCategoriasRepositorio } = require('./modelos/categoriasRepositorio');
const { crearHuespedesRepositorio } = require('./modelos/huespedesRepositorio');
const { crearIngredientesRepositorio } = require('./modelos/ingredientesRepositorio');
const { crearPedidosRepositorio } = require('./modelos/pedidosRepositorio');
const { crearPlatosRepositorio } = require('./modelos/platosRepositorio');
const { crearRecetasRepositorio } = require('./modelos/recetasRepositorio');
const { crearUsuariosRepositorio } = require('./modelos/usuariosRepositorio');

const { crearAutenticacionServicio } = require('./servicios/autenticacionServicio');
const { crearCategoriasServicio } = require('./servicios/categoriasServicio');
const { crearHuespedesServicio } = require('./servicios/huespedesServicio');
const { crearIngredientesServicio } = require('./servicios/ingredientesServicio');
const { crearPedidosServicio } = require('./servicios/pedidosServicio');
const { crearPlatosServicio } = require('./servicios/platosServicio');
const { crearReportesServicio } = require('./servicios/reportesServicio');
const { crearUsuariosServicio } = require('./servicios/usuariosServicio');

function crearContenedor(conexion) {
  const repositorios = {
    categoriasRepositorio: crearCategoriasRepositorio(conexion),
    huespedesRepositorio: crearHuespedesRepositorio(conexion),
    ingredientesRepositorio: crearIngredientesRepositorio(conexion),
    pedidosRepositorio: crearPedidosRepositorio(conexion),
    platosRepositorio: crearPlatosRepositorio(conexion),
    recetasRepositorio: crearRecetasRepositorio(conexion),
    usuariosRepositorio: crearUsuariosRepositorio(conexion),
  };

  const servicios = {};

  servicios.usuariosServicio = crearUsuariosServicio({
    usuariosRepositorio: repositorios.usuariosRepositorio,
  });

  servicios.autenticacionServicio = crearAutenticacionServicio({
    usuariosRepositorio: repositorios.usuariosRepositorio,
  });

  servicios.categoriasServicio = crearCategoriasServicio({
    categoriasRepositorio: repositorios.categoriasRepositorio,
  });

  servicios.huespedesServicio = crearHuespedesServicio({
    huespedesRepositorio: repositorios.huespedesRepositorio,
  });

  // Necesita recetasRepositorio + conexion para descontarPorReceta
  // (transacción atómica sobre varios ingredientes a la vez).
  servicios.ingredientesServicio = crearIngredientesServicio({
    ingredientesRepositorio: repositorios.ingredientesRepositorio,
    recetasRepositorio: repositorios.recetasRepositorio,
    conexion,
  });

  servicios.platosServicio = crearPlatosServicio({
    platosRepositorio: repositorios.platosRepositorio,
    recetasRepositorio: repositorios.recetasRepositorio,
    categoriasServicio: servicios.categoriasServicio,
    ingredientesServicio: servicios.ingredientesServicio,
    conexion,
  });

  // Pieza central del reto: necesita huespedesServicio (derecho de comidas),
  // platosServicio (disponibilidad) e ingredientesServicio (descuento por
  // receta), y `conexion` para que crear la comanda sea atómico.
  servicios.pedidosServicio = crearPedidosServicio({
    pedidosRepositorio: repositorios.pedidosRepositorio,
    huespedesServicio: servicios.huespedesServicio,
    platosServicio: servicios.platosServicio,
    ingredientesServicio: servicios.ingredientesServicio,
    conexion,
  });

  servicios.reportesServicio = crearReportesServicio({
    pedidosRepositorio: repositorios.pedidosRepositorio,
  });

  return { repositorios, servicios };
}

module.exports = { crearContenedor };
