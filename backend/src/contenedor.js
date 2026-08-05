// Contenedor de inyección de dependencias. Patrón reciclado de
// restaurante-app: cada repositorio se construye a partir de la conexión a
// BD, cada servicio recibe los repositorios (y otros servicios) que necesita
// por parámetro — nunca hace `require` directo de un repositorio. Así la
// lógica de negocio en servicios/ no depende de cómo se conecta a SQLite.
//
// Los módulos que faltan (huéspedes, ingredientes, pedidos) se agregan
// aquí siguiendo el mismo patrón: repositorio primero, servicio después,
// registrar ambos abajo.

const { crearUsuariosRepositorio } = require('./modelos/usuariosRepositorio');
const { crearCategoriasRepositorio } = require('./modelos/categoriasRepositorio');
const { crearPlatosRepositorio } = require('./modelos/platosRepositorio');
const { crearAutenticacionServicio } = require('./servicios/autenticacionServicio');
const { crearUsuariosServicio } = require('./servicios/usuariosServicio');
const { crearCategoriasServicio } = require('./servicios/categoriasServicio');
const { crearPlatosServicio } = require('./servicios/platosServicio');

function crearContenedor(conexion) {
  const repositorios = {
    usuariosRepositorio: crearUsuariosRepositorio(conexion),
    categoriasRepositorio: crearCategoriasRepositorio(conexion),
    platosRepositorio: crearPlatosRepositorio(conexion),
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
  };

  return { repositorios, servicios };
}

module.exports = { crearContenedor };
