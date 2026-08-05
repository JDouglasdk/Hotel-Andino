const { z } = require('zod');

const esquemaCrearCategoria = z.object({
  nombre: z.string().trim().min(1).max(80),
}).strict();

const esquemaActualizarCategoria = z.object({
  nombre: z.string().trim().min(1).max(80),
}).strict();

module.exports = { esquemaCrearCategoria, esquemaActualizarCategoria };
