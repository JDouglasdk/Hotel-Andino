// Contenedor de inyección de dependencias. Patrón reciclado de
// restaurante-app: cada repositorio se construye a partir de la conexión a
// BD, cada servicio recibe los repositorios (y otros servicios) que necesita
// por parámetro — nunca hace `require` directo de un repositorio. Así la
// lógica de negocio en servicios/ no depende de cómo se conecta a SQLite.
//
// El módulo que falta (ingredientes) se agrega aquí siguiendo el mismo
// patrón: repositorio primero, servicio después, registrar ambos abajo.

const { crearUsuariosRepositorio } = require('./modelos/usuariosRepositorio');
const { crearCategoriasRepositorio } = require('./modelos/categoriasRepositorio');
const { crearPlatosRepositorio } = require('./modelos/platosRepositorio');
const { crearHuespedesRepositorio } = require('./modelos/huespedesRepositorio');
const { crearPedidosRepositorio } = require('./modelos/pedidosRepositorio');
const { crearAutenticacionServicio } = require('./servicios/autenticacionServicio');
const { crearUsuariosServicio } = require('./servicios/usuariosServicio');
const { crearCategoriasServicio } = require('./servicios/categoriasServicio');
const { crearPlatosServicio } = require('./servicios/platosServicio');
const { crearHuespedesServicio } = require('./servicios/huespedesServicio');
const { crearPedidosServicio } = require('./servicios/pedidosServicio');

// TODO(compañero): reemplazar estos dos placeholders con la implementación
// real de derecho de comidas / descuento de inventario cuando existan — ver
// docs/superpowers/specs/2026-08-04-maquina-estados-comanda-design.md para
// la interfaz exacta. Solo hay que cambiar este registro, pedidosServicio
// no cambia.
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
    }),
    huespedesServicio: crearHuespedesServicio({
      huespedesRepositorio: repositorios.huespedesRepositorio,
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
