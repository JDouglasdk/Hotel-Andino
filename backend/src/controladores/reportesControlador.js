function crearReportesControlador({ reportesServicio }) {
  return {
    cajaDelDia(req, res) {
      res.json(reportesServicio.cajaDelDia());
    },
    platosServidosPorFranja(req, res) {
      res.json(reportesServicio.platosServidosPorFranja());
    },
  };
}

module.exports = { crearReportesControlador };
