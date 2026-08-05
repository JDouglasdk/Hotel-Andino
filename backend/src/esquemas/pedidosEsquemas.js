const { z } = require('zod');

const esquemaItemPedido = z.object({
  platoId: z.coerce.number().int().positive(),
  cantidad: z.number().int().positive(),
}).strict();

const esquemaCrearPedido = z.object({
  huespedId: z.coerce.number().int().positive(),
  franja: z.enum(['desayuno', 'almuerzo', 'cena']),
  items: z.array(esquemaItemPedido).min(1),
}).strict();

const esquemaCambiarEstadoPedido = z.object({
  estado: z.enum(['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado']),
}).strict();

const esquemaFiltrarPedidos = z.object({
  estado: z.enum(['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado']).optional(),
  franja: z.enum(['desayuno', 'almuerzo', 'cena']).optional(),
}).strict();

module.exports = { esquemaCrearPedido, esquemaCambiarEstadoPedido, esquemaFiltrarPedidos };
