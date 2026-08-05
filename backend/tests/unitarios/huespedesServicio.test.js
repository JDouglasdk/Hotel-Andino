const test = require('node:test');
const assert = require('node:assert/strict');
const { crearHuespedesServicio } = require('../../src/servicios/huespedesServicio');
const { ErrorDeNegocio, ErrorNoEncontrado } = require('../../src/utilidades/errores');

// Repositorio falso en memoria — el servicio no debe saber que es falso.
function crearRepositorioFalso() {
  const filas = [];
  let siguienteId = 1;

  return {
    obtenerPorDocumento(documento) {
      return filas.find((fila) => fila.documento === documento);
    },
    obtenerPorId(id) {
      return filas.find((fila) => fila.id === id);
    },
    crear({ documento, nombreCompleto, telefono, tipoHuesped }) {
      const fila = {
        id: siguienteId++,
        documento,
        nombre_completo: nombreCompleto,
        telefono: telefono ?? null,
        tipo_huesped: tipoHuesped,
      };
      filas.push(fila);
      return fila;
    },
    listarTodos() {
      return filas.slice();
    },
  };
}

test('crearHuesped da de alta un huésped con tipo válido', () => {
  const servicio = crearHuespedesServicio({ huespedesRepositorio: crearRepositorioFalso() });

  const huesped = servicio.crearHuesped({
    documento: '1001',
    nombreCompleto: 'Ana Pérez',
    telefono: '3001234567',
    tipoHuesped: 'ejecutivo',
  });

  assert.equal(huesped.documento, '1001');
  assert.equal(huesped.tipo_huesped, 'ejecutivo');
});

test('crearHuesped rechaza un tipo_huesped inválido', () => {
  const servicio = crearHuespedesServicio({ huespedesRepositorio: crearRepositorioFalso() });

  assert.throws(
    () =>
      servicio.crearHuesped({
        documento: '1002',
        nombreCompleto: 'Luis Gómez',
        tipoHuesped: 'premium',
      }),
    (error) => error instanceof ErrorDeNegocio && error.codigo === 'TIPO_HUESPED_INVALIDO'
  );
});

test('crearHuesped rechaza documento duplicado', () => {
  const servicio = crearHuespedesServicio({ huespedesRepositorio: crearRepositorioFalso() });

  servicio.crearHuesped({ documento: '1003', nombreCompleto: 'Marta Ríos', tipoHuesped: 'vip' });

  assert.throws(
    () =>
      servicio.crearHuesped({ documento: '1003', nombreCompleto: 'Otra Persona', tipoHuesped: 'ordinario' }),
    (error) => error instanceof ErrorDeNegocio && error.codigo === 'DOCUMENTO_DUPLICADO' && error.status === 409
  );
});

test('buscarPorDocumento devuelve el huésped si existe', () => {
  const servicio = crearHuespedesServicio({ huespedesRepositorio: crearRepositorioFalso() });
  servicio.crearHuesped({ documento: '2001', nombreCompleto: 'Carlos Ruiz', tipoHuesped: 'ordinario' });

  const huesped = servicio.buscarPorDocumento('2001');

  assert.equal(huesped.nombre_completo, 'Carlos Ruiz');
});

test('buscarPorDocumento lanza ErrorNoEncontrado si no existe', () => {
  const servicio = crearHuespedesServicio({ huespedesRepositorio: crearRepositorioFalso() });

  assert.throws(
    () => servicio.buscarPorDocumento('no-existe'),
    (error) => error instanceof ErrorNoEncontrado && error.status === 404
  );
});

test('obtenerPorId lanza ErrorNoEncontrado si no existe', () => {
  const servicio = crearHuespedesServicio({ huespedesRepositorio: crearRepositorioFalso() });

  assert.throws(
    () => servicio.obtenerPorId(999),
    (error) => error instanceof ErrorNoEncontrado
  );
});
