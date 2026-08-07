function crearHuespedesControlador({ huespedesServicio }) {
  return {
    crear(req, res) {
      const huesped = huespedesServicio.crearHuesped({
        documento: req.body.documento,
        nombreCompleto: req.body.nombreCompleto,
        telefono: req.body.telefono,
        tipoHuesped: req.body.tipoHuesped,
        usuarioId: req.usuario.id,
      });
      res.status(201).json(huesped);
    },
    buscarPorDocumento(req, res) {
      const huesped = huespedesServicio.buscarHuespedPorDocumento(req.query.documento);
      res.json(huesped);
    },
  };
}

module.exports = { crearHuespedesControlador };
