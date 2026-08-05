const { z } = require('zod');
const { ErrorDeNegocio } = require('../utilidades/errores');
const { TIPOS_HUESPED_VALIDOS } = require('../servicios/huespedesServicio');

const esquemaCrearHuesped = z.object({
  documento: z.string().trim().min(1, 'El documento es obligatorio').max(30),
  nombreCompleto: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  telefono: z.string().trim().max(30).optional(),
  tipoHuesped: z.enum(TIPOS_HUESPED_VALIDOS),
});

function crearHuespedesControlador({ huespedesServicio, pedidosServicio }) {
  function crear(req, res, next) {
    const resultado = esquemaCrearHuesped.safeParse(req.body);
    if (!resultado.success) {
      return next(
        new ErrorDeNegocio('Datos de huésped inválidos', {
          codigo: 'VALIDACION',
          status: 400,
        })
      );
    }

    try {
      const huesped = huespedesServicio.crearHuesped(resultado.data);
      return res.status(201).json({ huesped });
    } catch (error) {
      return next(error);
    }
  }

  function obtenerPorDocumento(req, res, next) {
    try {
      const huesped = huespedesServicio.buscarPorDocumento(req.params.documento);
      return res.status(200).json({ huesped });
    } catch (error) {
      return next(error);
    }
  }

  function listar(req, res, next) {
    try {
      const huespedes = huespedesServicio.listarTodos();
      return res.status(200).json({ huespedes });
    } catch (error) {
      return next(error);
    }
  }

  // Requerimiento funcional de la ficha técnica: "consultar su plan de
  // alimentación". Se busca por documento (igual que obtenerPorDocumento)
  // y se delega la regla de negocio a pedidosServicio — un solo lugar
  // define cuántas franjas tiene derecho un huésped y cuántas ya consumió.
  function planAlimentacion(req, res, next) {
    try {
      const huesped = huespedesServicio.buscarPorDocumento(req.params.documento);
      const plan = pedidosServicio.consultarPlanAlimentacion(huesped.id);
      return res.status(200).json({ plan });
    } catch (error) {
      return next(error);
    }
  }

  return { crear, obtenerPorDocumento, listar, planAlimentacion };
}

module.exports = { crearHuespedesControlador, esquemaCrearHuesped };
