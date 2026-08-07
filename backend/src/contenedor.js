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
const { crearMovimientosIngredienteRepositorio } = require('./modelos/movimientosIngredienteRepositorio');
const { crearPedidoTransicionRepositorio } = require('./modelos/pedidoTransicionRepositorio');
const { crearAutenticacionServicio } = require('./servicios/autenticacionServicio');
const { crearUsuariosServicio } = require('./servicios/usuariosServicio');
const { crearCategoriasServicio } = require('./servicios/categoriasServicio');
const { crearPlatosServicio } = require('./servicios/platosServicio');
const { crearHuespedesServicio } = require('./servicios/huespedesServicio');
const { crearPedidosServicio } = require('./servicios/pedidosServicio');
const { crearIngredientesServicio } = require('./servicios/ingredientesServicio');
const { crearDerechoDeComidasServicio } = require('./servicios/derechoDeComidasServicio');
const { crearInventarioServicio } = require('./servicios/inventarioServicio');
const { crearReportesServicio } = require('./servicios/reportesServicio');

function crearContenedor(conexion) {
  const repositorios = {
    usuariosRepositorio: crearUsuariosRepositorio(conexion),
    categoriasRepositorio: crearCategoriasRepositorio(conexion),
    platosRepositorio: crearPlatosRepositorio(conexion),
    huespedesRepositorio: crearHuespedesRepositorio(conexion),
    pedidosRepositorio: crearPedidosRepositorio(conexion),
    ingredientesRepositorio: crearIngredientesRepositorio(conexion),
    recetasRepositorio: crearRecetasRepositorio(conexion),
    movimientosIngredienteRepositorio: crearMovimientosIngredienteRepositorio(conexion),
    pedidoTransicionRepositorio: crearPedidoTransicionRepositorio(conexion),
  };

  const autenticacionServicio = crearAutenticacionServicio({ usuariosRepositorio: repositorios.usuariosRepositorio });

  const ingredientesServicio = crearIngredientesServicio({
    ingredientesRepositorio: repositorios.ingredientesRepositorio,
    recetasRepositorio: repositorios.recetasRepositorio,
    movimientosIngredienteRepositorio: repositorios.movimientosIngredienteRepositorio,
    conexion,
  });

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
    ingredientesServicio,
    pedidosServicio: crearPedidosServicio({
      pedidosRepositorio: repositorios.pedidosRepositorio,
      pedidoTransicionRepositorio: repositorios.pedidoTransicionRepositorio,
      huespedesRepositorio: repositorios.huespedesRepositorio,
      platosRepositorio: repositorios.platosRepositorio,
      derechoDeComidasServicio: crearDerechoDeComidasServicio({
        huespedesRepositorio: repositorios.huespedesRepositorio,
        pedidosRepositorio: repositorios.pedidosRepositorio,
      }),
      inventarioServicio: crearInventarioServicio({
        ingredientesServicio,
        conexion,
      }),
      conexion,
    }),
    reportesServicio: crearReportesServicio({
      pedidosRepositorio: repositorios.pedidosRepositorio,
    }),
  };

  return { repositorios, servicios };
}

module.exports = { crearContenedor };
