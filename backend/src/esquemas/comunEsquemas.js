const { z } = require('zod');

const esquemaIdParametro = z.object({
  id: z.coerce.number().int().positive(),
});

// Reutilizable mañana para el módulo de huéspedes (nombre, teléfono).
const nombrePersona = z.string()
  .transform((valor) => valor.trim().normalize('NFC'))
  .refine((valor) => valor.length >= 1, { message: 'El nombre es obligatorio', abort: true })
  .refine((valor) => valor.length <= 60, { message: 'Máximo 60 caracteres', abort: true })
  .refine((valor) => /^[\p{L}\s'-]+$/u.test(valor), { message: 'Solo letras, espacios, apóstrofe y guion', abort: true });

const telefono = z.string()
  .transform((valor) => valor.replace(/[\s\-().]/g, ''))
  .refine((valor) => /^\+?\d+$/.test(valor), { message: 'Solo dígitos, con + opcional al inicio', abort: true })
  .refine((valor) => valor.replace('+', '').length <= 15, { message: 'Máximo 15 dígitos', abort: true })
  .refine((valor) => valor.replace('+', '').length >= 7, { message: 'El teléfono es demasiado corto', abort: true });

module.exports = { esquemaIdParametro, nombrePersona, telefono };
