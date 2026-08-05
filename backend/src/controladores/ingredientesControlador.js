const { z } = require('zod');
const { ErrorDeNegocio } = require('../utilidades/errores');

const esquemaCrearIngrediente = z.object({
  nombre: z.string().trim().min(1).max(100),
  cantidadStock: z.number().min(0),
  unidadMedida: z.string().trim().min(1).max(20),
});

const esquemaEditarStock = z.object({
  cantidadStock: z.number().min(0),
});

function crearIngredientesControlador({ ingredientesServicio }) {
  function crear(req, res, next) {
    const resultado = esquemaCrearIngrediente.safeParse(req.body);
    if (!resultado.success) {
      return next(new ErrorDeNegocio('Datos de ingrediente inválidos', { codigo: 'VALIDACION', status: 400 }));
    }

    try {
      const ingrediente = ingredientesServicio.crearIngrediente(resultado.data);
      return res.status(201).json({ ingrediente });
    } catch (error) {
      return next(error);
    }
  }

  function editarStock(req, res, next) {
    const resultado = esquemaEditarStock.safeParse(req.body);
    if (!resultado.success) {
      return next(new ErrorDeNegocio('Datos de stock inválidos', { codigo: 'VALIDACION', status: 400 }));
    }

    try {
      const ingrediente = ingredientesServicio.editarStock(Number(req.params.id), resultado.data.cantidadStock);
      return res.status(200).json({ ingrediente });
    } catch (error) {
      return next(error);
    }
  }

  function listar(req, res, next) {
    try {
      const ingredientes = ingredientesServicio.listarTodos();
      return res.status(200).json({ ingredientes });
    } catch (error) {
      return next(error);
    }
  }

  return { crear, editarStock, listar };
}

module.exports = { crearIngredientesControlador };
