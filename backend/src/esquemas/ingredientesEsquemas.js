const { z } = require('zod');

const esquemaCrearIngrediente = z.object({
  nombre: z.string().trim().min(1).max(100),
  cantidadStock: z.number().min(0),
  unidadMedida: z.string().trim().min(1).max(20),
}).strict();

const esquemaRegistrarMovimiento = z.object({
  delta: z.number().refine((valor) => valor !== 0, { message: 'delta no puede ser 0' }),
  motivo: z.enum(['compra', 'merma', 'ajuste']),
}).strict();

module.exports = { esquemaCrearIngrediente, esquemaRegistrarMovimiento };
