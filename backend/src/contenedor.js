// Contenedor de inyección de dependencias. Patrón reciclado de
// restaurante-app: cada repositorio se construye a partir de la conexión a
// BD, cada servicio recibe los repositorios (y otros servicios) que necesita
// por parámetro — nunca hace `require` directo de un repositorio. Así la
// lógica de negocio en servicios/ no depende de cómo se conecta a SQLite.
//
// Ejemplo de cómo se va llenando esto a medida que se construyen módulos
// mañana (usuarios ya como referencia, el resto queda comentado hasta que
// exista el archivo):
//
// const { crearUsuariosRepositorio } = require('./modelos/usuariosRepositorio');
// const { crearAutenticacionServicio } = require('./servicios/autenticacionServicio');
// const { crearUsuariosServicio } = require('./servicios/usuariosServicio');

function crearContenedor(conexion) { // eslint-disable-line no-unused-vars
  const repositorios = {
    // usuariosRepositorio: crearUsuariosRepositorio(conexion),
  };

  const servicios = {
    // autenticacionServicio: crearAutenticacionServicio({ usuariosRepositorio: repositorios.usuariosRepositorio }),
  };

  return { repositorios, servicios };
}

module.exports = { crearContenedor };
