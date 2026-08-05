const { z } = require('zod');
const { ErrorDeNegocio } = require('../utilidades/errores');
const { FRANJAS_VALIDAS } = require('../servicios/pedidosServicio');

const esquemaCrearPedido = z.object({
  huespedId: z.number().int().positive(),
  franja: z.enum(FRANJAS_VALIDAS),
  items: z
    .array(
      z.object({
        platoId: z.number().int().positive(),
        cantidad: z.number().int().positive(),
      })
    )
    .min(1, 'La comanda debe incluir al menos un plato'),
});

const esquemaCambiarEstado = z.object({
  estado: z.enum(['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado']),
});

function crearPedidosControlador({ pedidosServicio }) {
  function crear(req, res, next) {
    const resultado = esquemaCrearPedido.safeParse(req.body);
    if (!resultado.success) {
      return next(new ErrorDeNegocio('Datos de comanda inválidos', { codigo: 'VALIDACION', status: 400 }));
    }

    try {
      // `usuarioId` viene de la sesión (quién la registró), nunca del
      // cuerpo de la petición — no se confía en que el cliente diga quién es.
      const pedido = pedidosServicio.crearPedido({ ...resultado.data, usuarioId: req.usuario.id });
      return res.status(201).json({ pedido });
    } catch (error) {
      return next(error);
    }
  }

  function cambiarEstado(req, res, next) {
    const resultado = esquemaCambiarEstado.safeParse(req.body);
    if (!resultado.success) {
      return next(new ErrorDeNegocio('Estado inválido', { codigo: 'VALIDACION', status: 400 }));
    }

    try {
      const pedido = pedidosServicio.cambiarEstado(Number(req.params.id), resultado.data.estado);
      return res.status(200).json({ pedido });
    } catch (error) {
      return next(error);
    }
  }

  function obtenerPorId(req, res, next) {
    try {
      const pedido = pedidosServicio.obtenerPedidoCompleto(Number(req.params.id));
      return res.status(200).json({ pedido });
    } catch (error) {
      return next(error);
    }
  }

  function listar(req, res, next) {
    try {
      const pedidos = pedidosServicio.listarTodos();
      return res.status(200).json({ pedidos });
    } catch (error) {
      return next(error);
    }
  }

  return { crear, cambiarEstado, obtenerPorId, listar };
}

module.exports = { crearPedidosControlador };
