function crearReportesControlador({ reportesServicio }) {
  function cajaDelDia(req, res, next) {
    try {
      const caja = reportesServicio.cajaDelDia();
      return res.status(200).json({ caja });
    } catch (error) {
      return next(error);
    }
  }

  function platosServidosPorFranja(req, res, next) {
    try {
      const reporte = reportesServicio.platosServidosPorFranja();
      return res.status(200).json({ reporte });
    } catch (error) {
      return next(error);
    }
  }

  return { cajaDelDia, platosServidosPorFranja };
}

module.exports = { crearReportesControlador };
