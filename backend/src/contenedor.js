// Contenedor de inyección de dependencias. Patrón reciclado de
// restaurante-app: cada repositorio se construye a partir de la conexión a
// BD, cada servicio recibe los repositorios (y otros servicios) que necesita
// por parámetro — nunca hace `require` directo de un repositorio. Así la
// lógica de negocio en servicios/ no depende de cómo se conecta a SQLite.

const { crearUsuariosRepositorio } = require('./modelos/usuariosRepositorio');
const { crearCategoriasRepositorio } = require('./modelos/categoriasRepositorio');
const { crearPlatosRepositorio } = require('./modelos/platosRepositorio');
const { crearHuespedesRepositorio } = require('./modelos/huespedesRepositorio');
const { crearPedidosRepositorio } = require('./modelos/pedidosRepositorio');
const { crearIngredientesRepositorio } = require('./modelos/ingredientesRepositorio');
const { crearRecetasRepositorio } = require('./modelos/recetasRepositorio');
const { crearAutenticacionServicio } = require('./servicios/autenticacionServicio');
const { crearUsuariosServicio } = require('./servicios/usuariosServicio');
const { crearCategoriasServicio } = require('./servicios/categoriasServicio');
const { crearPlatosServicio } = require('./servicios/platosServicio');
const { crearHuespedesServicio } = require('./servicios/huespedesServicio');
const { crearPedidosServicio } = require('./servicios/pedidosServicio');
const { crearIngredientesServicio } = require('./servicios/ingredientesServicio');

// TODO: reemplazar estos dos placeholders con la implementación real de
// derecho de comidas / descuento de inventario (Task 3 de
// docs/superpowers/plans/2026-08-04-inventario-derecho-comidas-reportes.md).
const derechoDeComidasServicioPlaceholder = {
  validarDerecho() {}, // permite todo
};
const inventarioServicioPlaceholder = {
  descontarPorPedido() {}, // no hace nada
};

function crearContenedor(conexion) {
  const repositorios = {
    usuariosRepositorio: crearUsuariosRepositorio(conexion),
    categoriasRepositorio: crearCategoriasRepositorio(conexion),
    platosRepositorio: crearPlatosRepositorio(conexion),
    huespedesRepositorio: crearHuespedesRepositorio(conexion),
    pedidosRepositorio: crearPedidosRepositorio(conexion),
    ingredientesRepositorio: crearIngredientesRepositorio(conexion),
    recetasRepositorio: crearRecetasRepositorio(conexion),
  };

  const autenticacionServicio = crearAutenticacionServicio({ usuariosRepositorio: repositorios.usuariosRepositorio });

  const servicios = {
    autenticacionServicio,
    usuariosServicio: crearUsuariosServicio({
      usuariosRepositorio: repositorios.usuariosRepositorio,
      autenticacionServicio,
    }),
    categoriasServicio: crearCategoriasServicio({
      categoriasRepositorio: repositorios.categoriasRepositorio,
    }),
    platosServicio: crearPlatosServicio({
      platosRepositorio: repositorios.platosRepositorio,
      categoriasRepositorio: repositorios.categoriasRepositorio,
      recetasRepositorio: repositorios.recetasRepositorio,
      ingredientesRepositorio: repositorios.ingredientesRepositorio,
    }),
    huespedesServicio: crearHuespedesServicio({
      huespedesRepositorio: repositorios.huespedesRepositorio,
    }),
    ingredientesServicio: crearIngredientesServicio({
      ingredientesRepositorio: repositorios.ingredientesRepositorio,
      recetasRepositorio: repositorios.recetasRepositorio,
    }),
    pedidosServicio: crearPedidosServicio({
      pedidosRepositorio: repositorios.pedidosRepositorio,
      huespedesRepositorio: repositorios.huespedesRepositorio,
      platosRepositorio: repositorios.platosRepositorio,
      derechoDeComidasServicio: derechoDeComidasServicioPlaceholder,
      inventarioServicio: inventarioServicioPlaceholder,
    }),
  };

  return { repositorios, servicios };
}

module.exports = { crearContenedor };
