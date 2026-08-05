const { z } = require('zod');
const { ErrorDeNegocio } = require('../utilidades/errores');

const esquemaCrearCategoria = z.object({
  nombre: z.string().trim().min(1).max(80),
});

function crearCategoriasControlador({ categoriasServicio }) {
  function crear(req, res, next) {
    const resultado = esquemaCrearCategoria.safeParse(req.body);
    if (!resultado.success) {
      return next(new ErrorDeNegocio('Datos de categoría inválidos', { codigo: 'VALIDACION', status: 400 }));
    }

    try {
      const categoria = categoriasServicio.crearCategoria(resultado.data);
      return res.status(201).json({ categoria });
    } catch (error) {
      return next(error);
    }
  }

  function listar(req, res, next) {
    try {
      const categorias = categoriasServicio.listarTodas();
      return res.status(200).json({ categorias });
    } catch (error) {
      return next(error);
    }
  }

  return { crear, listar };
}

module.exports = { crearCategoriasControlador };
