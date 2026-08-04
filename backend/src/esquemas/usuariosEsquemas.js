const { z } = require('zod');

const esquemaCrearUsuario = z.object({
  nombreCompleto: z.string().min(1),
  correo: z.string().email(),
  contrasena: z.string().min(1),
  rol: z.string().min(1),
}).strict();

const esquemaActualizarUsuario = z.object({
  nombreCompleto: z.string().min(1),
  correo: z.string().email(),
  rol: z.string().min(1),
}).strict();

const esquemaCambiarEstadoUsuario = z.object({
  activo: z.boolean(),
}).strict();

module.exports = { esquemaCrearUsuario, esquemaActualizarUsuario, esquemaCambiarEstadoUsuario };
