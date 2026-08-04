// Contenedor de inyección de dependencias. Patrón reciclado de
// restaurante-app: cada repositorio se construye a partir de la conexión a
// BD, cada servicio recibe los repositorios (y otros servicios) que necesita
// por parámetro — nunca hace `require` directo de un repositorio. Así la
// lógica de negocio en servicios/ no depende de cómo se conecta a SQLite.
//
// Los módulos que faltan (huéspedes, menú, ingredientes, pedidos) se agregan
// aquí siguiendo el mismo patrón: repositorio primero, servicio después,
// registrar ambos abajo.

const { crearUsuariosRepositorio } = require('./modelos/usuariosRepositorio');
const { crearAutenticacionServicio } = require('./servicios/autenticacionServicio');
const { crearUsuariosServicio } = require('./servicios/usuariosServicio');

function crearContenedor(conexion) {
  const repositorios = {
    usuariosRepositorio: crearUsuariosRepositorio(conexion),
  };

  const autenticacionServicio = crearAutenticacionServicio({ usuariosRepositorio: repositorios.usuariosRepositorio });

  const servicios = {
    autenticacionServicio,
    usuariosServicio: crearUsuariosServicio({
      usuariosRepositorio: repositorios.usuariosRepositorio,
      autenticacionServicio,
    }),
  };

  return { repositorios, servicios };
}

module.exports = { crearContenedor };
