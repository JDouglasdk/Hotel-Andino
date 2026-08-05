const { z } = require('zod');
const { ErrorDeNegocio } = require('../utilidades/errores');

const esquemaCrearPlato = z.object({
  categoriaId: z.number().int().positive(),
  nombre: z.string().trim().min(1).max(150),
  precio: z.number().int().min(0),
  informacion: z.string().trim().max(500).optional(),
  receta: z
    .array(
      z.object({
        ingredienteId: z.number().int().positive(),
        cantidadRequerida: z.number().positive(),
      })
    )
    .min(1, 'El plato necesita al menos un ingrediente en la receta'),
});

function crearPlatosControlador({ platosServicio }) {
  function crear(req, res, next) {
    const resultado = esquemaCrearPlato.safeParse(req.body);
    if (!resultado.success) {
      return next(new ErrorDeNegocio('Datos de plato inválidos', { codigo: 'VALIDACION', status: 400 }));
    }

    try {
      const plato = platosServicio.crearPlato(resultado.data);
      return res.status(201).json({ plato });
    } catch (error) {
      return next(error);
    }
  }

  function listar(req, res, next) {
    try {
      const platos = platosServicio.listarTodos();
      return res.status(200).json({ platos });
    } catch (error) {
      return next(error);
    }
  }

  function obtenerPorId(req, res, next) {
    try {
      const plato = platosServicio.obtenerPorId(Number(req.params.id));
      return res.status(200).json({ plato });
    } catch (error) {
      return next(error);
    }
  }

  return { crear, listar, obtenerPorId };
}

module.exports = { crearPlatosControlador };
