const { z } = require('zod');

const camposPlato = {
  categoriaId: z.coerce.number().int().positive(),
  nombre: z.string().min(1).max(100),
  precio: z.number().int().min(0),
  informacion: z.string().max(500).optional(),
};

const esquemaCrearPlato = z.object(camposPlato).strict();
const esquemaActualizarPlato = z.object(camposPlato).strict();

const esquemaCambiarDisponibilidadPlato = z.object({
  disponible: z.boolean(),
}).strict();

// z.coerce.boolean() NO sirve aquí: internamente hace Boolean(valor), y
// cualquier string no vacío (incluido "false") es verdadero en JS. Se usa
// un enum + transform para que "?disponible=false" se interprete bien.
const disponibleQueryBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

const esquemaFiltrarPlatos = z.object({
  categoriaId: z.coerce.number().int().positive().optional(),
  disponible: disponibleQueryBooleano.optional(),
}).strict();

const esquemaReemplazarReceta = z.object({
  items: z.array(z.object({
    ingredienteId: z.coerce.number().int().positive(),
    cantidadRequerida: z.number().positive(),
  })).min(1).refine(
    (items) => new Set(items.map((item) => item.ingredienteId)).size === items.length,
    { message: 'No se puede repetir un ingredienteId en la receta' },
  ),
}).strict();

module.exports = {
  esquemaCrearPlato,
  esquemaActualizarPlato,
  esquemaCambiarDisponibilidadPlato,
  esquemaFiltrarPlatos,
  esquemaReemplazarReceta,
};
