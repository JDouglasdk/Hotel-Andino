const { z } = require('zod');

const esquemaLogin = z.object({
  correo: z.string().email().max(254),
  contrasena: z.string().min(1),
}).strict();

module.exports = { esquemaLogin };
