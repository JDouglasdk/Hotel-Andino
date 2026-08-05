// Caja diaria: suma de comandas ENTREGADAS del día (ver docs/decisiones.md
// — fuera de alcance cualquier ingreso/egreso que no venga de venta de
// platos). Reutiliza pedidosRepositorio en vez de tener su propio acceso a
// datos, para no duplicar la definición de "hoy" ni de "entregado".
const { FRANJAS_VALIDAS } = require('./pedidosServicio');

function crearReportesServicio({ pedidosRepositorio }) {
  function cajaDelDia() {
    return {
      fecha: new Date().toISOString().slice(0, 10),
      total: pedidosRepositorio.totalEntregadoHoy(),
    };
  }

  // Reporte de platos servidos por franja (desayuno/almuerzo/cena), pedido
  // explícito de la ficha técnica. Completa en 0 las franjas sin ventas hoy
  // para que el reporte siempre muestre las 3 franjas, no solo las que
  // tuvieron movimiento.
  function platosServidosPorFranja() {
    const filas = pedidosRepositorio.platosServidosPorFranjaHoy();
    const cantidadPorFranja = new Map(filas.map((fila) => [fila.franja, fila.cantidad]));

    return {
      fecha: new Date().toISOString().slice(0, 10),
      franjas: FRANJAS_VALIDAS.map((franja) => ({
        franja,
        cantidad: cantidadPorFranja.get(franja) ?? 0,
      })),
    };
  }

  return { cajaDelDia, platosServidosPorFranja };
}

module.exports = { crearReportesServicio };
