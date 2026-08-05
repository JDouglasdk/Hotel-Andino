const test = require('node:test');
const assert = require('node:assert/strict');

const { crearConexion } = require('../../src/db/conexion');
const { aplicarMigraciones } = require('../../src/db/migraciones/migrar');
const { crearHuespedesRepositorio } = require('../../src/modelos/huespedesRepositorio');
const { crearCategoriasRepositorio } = require('../../src/modelos/categoriasRepositorio');
const { crearIngredientesRepositorio } = require('../../src/modelos/ingredientesRepositorio');
const { crearPlatosRepositorio } = require('../../src/modelos/platosRepositorio');
const { crearRecetasRepositorio } = require('../../src/modelos/recetasRepositorio');
const { crearPedidosRepositorio } = require('../../src/modelos/pedidosRepositorio');
const { crearHuespedesServicio } = require('../../src/servicios/huespedesServicio');
const { crearCategoriasServicio } = require('../../src/servicios/categoriasServicio');
const { crearIngredientesServicio } = require('../../src/servicios/ingredientesServicio');
const { crearPlatosServicio } = require('../../src/servicios/platosServicio');
const { crearPedidosServicio } = require('../../src/servicios/pedidosServicio');
const { crearReportesServicio } = require('../../src/servicios/reportesServicio');
const { ErrorDeNegocio } = require('../../src/utilidades/errores');

// Fixture con BD SQLite real en memoria: la regla de derecho de comidas y el
// descuento de inventario son la pieza de mayor riesgo del reto (ver
// docs/decisiones.md) — se prueban contra la BD real, no con dobles, para
// verificar también el comportamiento transaccional (rollback).
function crearFixture() {
  const conexion = crearConexion(':memory:');
  aplicarMigraciones(conexion);

  const usuarioId = conexion
    .prepare(
      `INSERT INTO usuarios (nombre_completo, correo, contrasena_hash, rol)
       VALUES ('Mesero de prueba', 'mesero@test.com', 'hash', 'mesero')`
    )
    .run().lastInsertRowid;

  const huespedesRepositorio = crearHuespedesRepositorio(conexion);
  const categoriasRepositorio = crearCategoriasRepositorio(conexion);
  const ingredientesRepositorio = crearIngredientesRepositorio(conexion);
  const platosRepositorio = crearPlatosRepositorio(conexion);
  const recetasRepositorio = crearRecetasRepositorio(conexion);
  const pedidosRepositorio = crearPedidosRepositorio(conexion);

  const huespedesServicio = crearHuespedesServicio({ huespedesRepositorio });
  const categoriasServicio = crearCategoriasServicio({ categoriasRepositorio });
  const ingredientesServicio = crearIngredientesServicio({ ingredientesRepositorio, recetasRepositorio, conexion });
  const platosServicio = crearPlatosServicio({
    platosRepositorio,
    recetasRepositorio,
    categoriasServicio,
    ingredientesServicio,
    conexion,
  });
  const pedidosServicio = crearPedidosServicio({
    pedidosRepositorio,
    huespedesServicio,
    platosServicio,
    ingredientesServicio,
    conexion,
  });
  const reportesServicio = crearReportesServicio({ pedidosRepositorio });

  return {
    usuarioId,
    huespedesServicio,
    categoriasServicio,
    ingredientesServicio,
    platosServicio,
    pedidosServicio,
    reportesServicio,
  };
}

// Crea un plato con una receta simple de un ingrediente con stock definido.
function crearPlatoConReceta(fixture, { stockInicial, cantidadRequerida, precio = 20000 }) {
  const categoria = fixture.categoriasServicio.crearCategoria({ nombre: `Categoria-${Math.random()}` });
  const ingrediente = fixture.ingredientesServicio.crearIngrediente({
    nombre: `Ingrediente-${Math.random()}`,
    cantidadStock: stockInicial,
    unidadMedida: 'g',
  });
  const plato = fixture.platosServicio.crearPlato({
    categoriaId: categoria.id,
    nombre: `Plato-${Math.random()}`,
    precio,
    receta: [{ ingredienteId: ingrediente.id, cantidadRequerida }],
  });
  return { plato, ingrediente };
}

test('permite comida dentro del límite del huésped ordinario (1/día)', () => {
  const fixture = crearFixture();
  const huesped = fixture.huespedesServicio.crearHuesped({
    documento: 'H1',
    nombreCompleto: 'Huésped Ordinario',
    tipoHuesped: 'ordinario',
  });
  const { plato } = crearPlatoConReceta(fixture, { stockInicial: 100, cantidadRequerida: 10 });

  const pedido = fixture.pedidosServicio.crearPedido({
    huespedId: huesped.id,
    usuarioId: fixture.usuarioId,
    franja: 'desayuno',
    items: [{ platoId: plato.id, cantidad: 1 }],
  });

  assert.equal(pedido.items.length, 1);
});

test('rechaza una segunda franja distinta el mismo día para un huésped ordinario', () => {
  const fixture = crearFixture();
  const huesped = fixture.huespedesServicio.crearHuesped({
    documento: 'H2',
    nombreCompleto: 'Huésped Ordinario 2',
    tipoHuesped: 'ordinario',
  });
  const { plato } = crearPlatoConReceta(fixture, { stockInicial: 100, cantidadRequerida: 5 });

  fixture.pedidosServicio.crearPedido({
    huespedId: huesped.id,
    usuarioId: fixture.usuarioId,
    franja: 'desayuno',
    items: [{ platoId: plato.id, cantidad: 1 }],
  });

  assert.throws(
    () =>
      fixture.pedidosServicio.crearPedido({
        huespedId: huesped.id,
        usuarioId: fixture.usuarioId,
        franja: 'almuerzo',
        items: [{ platoId: plato.id, cantidad: 1 }],
      }),
    (error) => error instanceof ErrorDeNegocio && error.codigo === 'LIMITE_COMIDAS_EXCEDIDO'
  );
});

test('no cuenta doble si se repite la misma franja ya consumida hoy', () => {
  const fixture = crearFixture();
  const huesped = fixture.huespedesServicio.crearHuesped({
    documento: 'H3',
    nombreCompleto: 'Huésped Repite Franja',
    tipoHuesped: 'ordinario',
  });
  const { plato } = crearPlatoConReceta(fixture, { stockInicial: 100, cantidadRequerida: 1 });

  fixture.pedidosServicio.crearPedido({
    huespedId: huesped.id,
    usuarioId: fixture.usuarioId,
    franja: 'desayuno',
    items: [{ platoId: plato.id, cantidad: 1 }],
  });

  // Un segundo pedido en la MISMA franja no debe contar como una comida
  // adicional del límite diario (la regla cuenta franjas distintas).
  const segundoPedido = fixture.pedidosServicio.crearPedido({
    huespedId: huesped.id,
    usuarioId: fixture.usuarioId,
    franja: 'desayuno',
    items: [{ platoId: plato.id, cantidad: 1 }],
  });

  assert.ok(segundoPedido.id);
});

test('vip puede consumir hasta 3 franjas distintas el mismo día', () => {
  const fixture = crearFixture();
  const huesped = fixture.huespedesServicio.crearHuesped({
    documento: 'H4',
    nombreCompleto: 'Huésped VIP',
    tipoHuesped: 'vip',
  });
  const { plato } = crearPlatoConReceta(fixture, { stockInicial: 1000, cantidadRequerida: 1 });

  for (const franja of ['desayuno', 'almuerzo', 'cena']) {
    fixture.pedidosServicio.crearPedido({
      huespedId: huesped.id,
      usuarioId: fixture.usuarioId,
      franja,
      items: [{ platoId: plato.id, cantidad: 1 }],
    });
  }

  assert.throws(
    () =>
      fixture.pedidosServicio.crearPedido({
        huespedId: huesped.id,
        usuarioId: fixture.usuarioId,
        franja: 'desayuno', // ya consumió las 3 franjas posibles
        items: [{ platoId: plato.id, cantidad: 1 }],
      }),
    (error) => error instanceof ErrorDeNegocio && error.codigo === 'LIMITE_COMIDAS_EXCEDIDO'
  );
});

test('descuenta el inventario según la receta al crear el pedido', () => {
  const fixture = crearFixture();
  const huesped = fixture.huespedesServicio.crearHuesped({
    documento: 'H5',
    nombreCompleto: 'Huésped Inventario',
    tipoHuesped: 'ejecutivo',
  });
  const { plato, ingrediente } = crearPlatoConReceta(fixture, { stockInicial: 100, cantidadRequerida: 10 });

  fixture.pedidosServicio.crearPedido({
    huespedId: huesped.id,
    usuarioId: fixture.usuarioId,
    franja: 'almuerzo',
    items: [{ platoId: plato.id, cantidad: 3 }], // 3 * 10 = 30 unidades
  });

  const ingredienteActualizado = fixture.ingredientesServicio.obtenerPorId(ingrediente.id);
  assert.equal(ingredienteActualizado.cantidad_stock, 70);
});

test('stock insuficiente rechaza el pedido y no descuenta ni crea nada (rollback)', () => {
  const fixture = crearFixture();
  const huesped = fixture.huespedesServicio.crearHuesped({
    documento: 'H6',
    nombreCompleto: 'Huésped Sin Stock',
    tipoHuesped: 'vip',
  });
  const { plato, ingrediente } = crearPlatoConReceta(fixture, { stockInicial: 5, cantidadRequerida: 10 });

  assert.throws(
    () =>
      fixture.pedidosServicio.crearPedido({
        huespedId: huesped.id,
        usuarioId: fixture.usuarioId,
        franja: 'cena',
        items: [{ platoId: plato.id, cantidad: 1 }], // necesita 10, solo hay 5
      }),
    (error) => error instanceof ErrorDeNegocio && error.codigo === 'STOCK_INSUFICIENTE'
  );

  const ingredienteTrasFallo = fixture.ingredientesServicio.obtenerPorId(ingrediente.id);
  assert.equal(ingredienteTrasFallo.cantidad_stock, 5, 'el stock no debe cambiar si falla la comanda');

  const pedidos = fixture.pedidosServicio.listarTodos();
  assert.equal(pedidos.length, 0, 'no debe quedar creada una comanda a medio confirmar');
});

test('máquina de estados: transición válida pendiente -> en_preparacion -> listo -> entregado', () => {
  const fixture = crearFixture();
  const huesped = fixture.huespedesServicio.crearHuesped({
    documento: 'H7',
    nombreCompleto: 'Huésped Estados',
    tipoHuesped: 'ordinario',
  });
  const { plato } = crearPlatoConReceta(fixture, { stockInicial: 100, cantidadRequerida: 1 });

  const pedido = fixture.pedidosServicio.crearPedido({
    huespedId: huesped.id,
    usuarioId: fixture.usuarioId,
    franja: 'desayuno',
    items: [{ platoId: plato.id, cantidad: 1 }],
  });

  fixture.pedidosServicio.cambiarEstado(pedido.id, 'en_preparacion');
  fixture.pedidosServicio.cambiarEstado(pedido.id, 'listo');
  const entregado = fixture.pedidosServicio.cambiarEstado(pedido.id, 'entregado');

  assert.equal(entregado.estado, 'entregado');
});

test('máquina de estados: rechaza transición inválida (pendiente -> entregado)', () => {
  const fixture = crearFixture();
  const huesped = fixture.huespedesServicio.crearHuesped({
    documento: 'H8',
    nombreCompleto: 'Huésped Estados 2',
    tipoHuesped: 'ordinario',
  });
  const { plato } = crearPlatoConReceta(fixture, { stockInicial: 100, cantidadRequerida: 1 });

  const pedido = fixture.pedidosServicio.crearPedido({
    huespedId: huesped.id,
    usuarioId: fixture.usuarioId,
    franja: 'desayuno',
    items: [{ platoId: plato.id, cantidad: 1 }],
  });

  assert.throws(
    () => fixture.pedidosServicio.cambiarEstado(pedido.id, 'entregado'),
    (error) => error instanceof ErrorDeNegocio && error.codigo === 'TRANSICION_INVALIDA'
  );
});

test('máquina de estados: un pedido entregado o cancelado ya no cambia de estado', () => {
  const fixture = crearFixture();
  const huesped = fixture.huespedesServicio.crearHuesped({
    documento: 'H9',
    nombreCompleto: 'Huésped Estados 3',
    tipoHuesped: 'ordinario',
  });
  const { plato } = crearPlatoConReceta(fixture, { stockInicial: 100, cantidadRequerida: 1 });

  const pedido = fixture.pedidosServicio.crearPedido({
    huespedId: huesped.id,
    usuarioId: fixture.usuarioId,
    franja: 'desayuno',
    items: [{ platoId: plato.id, cantidad: 1 }],
  });

  fixture.pedidosServicio.cambiarEstado(pedido.id, 'cancelado');

  assert.throws(
    () => fixture.pedidosServicio.cambiarEstado(pedido.id, 'en_preparacion'),
    (error) => error instanceof ErrorDeNegocio && error.codigo === 'TRANSICION_INVALIDA'
  );
});

test('caja diaria solo suma comandas entregadas, no pendientes ni canceladas', () => {
  const fixture = crearFixture();
  const huesped = fixture.huespedesServicio.crearHuesped({
    documento: 'H10',
    nombreCompleto: 'Huésped Caja',
    tipoHuesped: 'vip',
  });
  const { plato: platoEntregado } = crearPlatoConReceta(fixture, {
    stockInicial: 100,
    cantidadRequerida: 1,
    precio: 15000,
  });
  const { plato: platoPendiente } = crearPlatoConReceta(fixture, {
    stockInicial: 100,
    cantidadRequerida: 1,
    precio: 99999,
  });

  const pedidoEntregado = fixture.pedidosServicio.crearPedido({
    huespedId: huesped.id,
    usuarioId: fixture.usuarioId,
    franja: 'desayuno',
    items: [{ platoId: platoEntregado.id, cantidad: 2 }], // 30000
  });
  fixture.pedidosServicio.cambiarEstado(pedidoEntregado.id, 'en_preparacion');
  fixture.pedidosServicio.cambiarEstado(pedidoEntregado.id, 'listo');
  fixture.pedidosServicio.cambiarEstado(pedidoEntregado.id, 'entregado');

  // Este pedido queda pendiente y NO debe sumar a la caja.
  fixture.pedidosServicio.crearPedido({
    huespedId: huesped.id,
    usuarioId: fixture.usuarioId,
    franja: 'almuerzo',
    items: [{ platoId: platoPendiente.id, cantidad: 1 }],
  });

  const caja = fixture.reportesServicio.cajaDelDia();
  assert.equal(caja.total, 30000);
});
