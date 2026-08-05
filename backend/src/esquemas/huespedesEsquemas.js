const { z } = require('zod');
const { nombrePersona, telefono } = require('./comunEsquemas');

const esquemaCrearHuesped = z.object({
  documento: z.string().trim().min(1).max(30),
  nombreCompleto: nombrePersona,
  telefono: telefono.optional(),
  tipoHuesped: z.enum(['ordinario', 'ejecutivo', 'vip']),
}).strict();

const esquemaBuscarHuespedPorDocumento = z.object({
  documento: z.string().trim().min(1).max(30),
}).strict();

module.exports = { esquemaCrearHuesped, esquemaBuscarHuespedPorDocumento };
