const { z } = require('zod');

const esquemaCrearIngrediente = z.object({
  nombre: z.string().trim().min(1).max(100),
  cantidadStock: z.number().min(0),
  unidadMedida: z.string().trim().min(1).max(20),
}).strict();

const esquemaActualizarStock = z.object({
  cantidadStock: z.number().min(0),
}).strict();

module.exports = { esquemaCrearIngrediente, esquemaActualizarStock };
