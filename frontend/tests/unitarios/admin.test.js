// frontend/tests/unitarios/admin.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { crearDom, ejecutarScript } = require('../ayudas/dom');

const RUTA_ADMIN_HTML = path.join(__dirname, '../../public/admin.html');
const RUTA_DIALOGO = path.join(__dirname, '../../public/js/comun/dialogo.js');
const RUTA_CLIENTE_API = path.join(__dirname, '../../public/js/comun/clienteApi.js');
const RUTA_PANEL = path.join(__dirname, '../../public/js/comun/panel.js');
const RUTA_ADMIN_JS = path.join(__dirname, '../../public/js/admin.js');

const USUARIO_ADMIN = { id: 1, nombreCompleto: 'Ana Ríos', rol: 'admin' };

const USUARIOS = [
  { id: 1, nombreCompleto: 'Ana Ríos', correo: 'ana@hotel.co', rol: 'admin', activo: true, creadoEn: '2026-08-01T08:00:00.000Z' },
  { id: 2, nombreCompleto: 'Luis Paz', correo: 'luis@hotel.co', rol: 'mesero', activo: false, creadoEn: '2026-08-02T08:00:00.000Z' },
];

const CATEGORIAS = [{ id: 1, nombre: 'Entradas' }, { id: 2, nombre: 'Platos fuertes' }];

const PLATOS = [
  { id: 5, categoriaId: 2, nombre: 'Bandeja paisa', precio: 32000, informacion: '', disponible: true, creadoEn: '2026-08-01T08:00:00.000Z' },
  { id: 6, categoriaId: 1, nombre: 'Sopa de guineo', precio: 12000, informacion: '', disponible: false, creadoEn: '2026-08-01T08:00:00.000Z' },
];

const INGREDIENTES = [
  { id: 3, nombre: 'Arroz', cantidadStock: 27.9000000000000002, unidadMedida: 'kg', actualizadoEn: '2026-08-05T10:00:00.000Z' },
  { id: 4, nombre: 'Aguacate', cantidadStock: 8, unidadMedida: 'unidad', actualizadoEn: '2026-08-05T10:00:00.000Z' },
];

function respuestaOk(cuerpo, status = 200) {
  return { status, ok: true, json: async () => cuerpo };
}

function respuestaError(status, codigo, mensaje) {
  return { status, ok: false, json: async () => ({ error: { codigo, mensaje } }) };
}

function esMetodo(opciones, metodo) {
  return Boolean(opciones) && opciones.method === metodo;
}

// El backend siempre entrega objetos recién deserializados: se copian los
// datos de prueba para que un panel no le mute los listados a otro test.
function copia(lista) {
  return lista.map((registro) => ({ ...registro }));
}

function rutasPorDefecto(extra = {}) {
  return {
    '/api/usuarios': () => respuestaOk(copia(USUARIOS)),
    '/api/categorias': () => respuestaOk(copia(CATEGORIAS)),
    '/api/platos': () => respuestaOk(copia(PLATOS)),
    '/api/ingredientes': () => respuestaOk(copia(INGREDIENTES)),
    ...extra,
  };
}

// Monta admin.html con dialogo/clienteApi/panel reales y stubs de sesion/header.
// `rutas` mapea la ruta pedida a una función (opciones) => respuesta simulada.
async function montarPanelAdmin(rutas = rutasPorDefecto()) {
  const dom = crearDom(RUTA_ADMIN_HTML);
  const llamadas = [];

  dom.window.Comun = {
    sesion: { verificar: async () => USUARIO_ADMIN },
    header: { construir: () => {} },
  };

  dom.window.fetch = async (ruta, opciones) => {
    llamadas.push({ ruta, opciones });
    const manejador = rutas[ruta];
    if (!manejador) throw new Error(`ruta inesperada: ${ruta}`);
    return manejador(opciones);
  };

  ejecutarScript(dom, RUTA_DIALOGO);
  ejecutarScript(dom, RUTA_CLIENTE_API);
  ejecutarScript(dom, RUTA_PANEL);
  ejecutarScript(dom, RUTA_ADMIN_JS);

  await dom.window.Comun._panelListo;
  await dom.window.Comun._adminCargando;

  return { dom, documento: dom.window.document, llamadas };
}

function clic(dom, elemento) {
  elemento.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
}

function enviarFormulario(dom, id) {
  dom.window.document.getElementById(id)
    .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

async function esperarCiclos(veces = 5) {
  for (let i = 0; i < veces; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function escribir(documento, id, valor) {
  documento.getElementById(id).value = valor;
}

function filasDe(documento, idContenedor) {
  return Array.from(documento.querySelectorAll(`#${idContenedor} tbody tr`))
    .map((fila) => Array.from(fila.querySelectorAll('td')).map((celda) => celda.textContent));
}

function filaPorDato(documento, idContenedor, atributo, valor) {
  return documento.querySelector(`#${idContenedor} tr[data-${atributo}="${valor}"]`);
}

function ultimaLlamada(llamadas) {
  return llamadas[llamadas.length - 1];
}

function textoDe(documento, id) {
  return documento.getElementById(id).textContent;
}

test('admin.html tiene los contenedores y formularios que admin.js necesita', () => {
  const doc = crearDom(RUTA_ADMIN_HTML).window.document;

  ['contenido-usuarios', 'formulario-usuario', 'nombre-usuario', 'correo-usuario', 'contrasena-usuario',
    'rol-usuario', 'boton-crear-usuario', 'error-usuarios', 'exito-usuarios',
    'formulario-huesped', 'documento-huesped', 'nombre-huesped', 'telefono-huesped', 'tipo-huesped',
    'boton-crear-huesped', 'error-huesped', 'exito-huesped',
    'contenido-categorias', 'formulario-categoria', 'nombre-categoria', 'boton-crear-categoria',
    'error-categorias', 'exito-categorias',
    'contenido-platos', 'formulario-plato', 'campos-plato', 'nombre-plato', 'categoria-plato',
    'precio-plato', 'informacion-plato', 'boton-crear-plato', 'aviso-sin-categorias',
    'error-platos', 'exito-platos',
    'contenido-ingredientes', 'formulario-ingrediente', 'nombre-ingrediente', 'cantidad-ingrediente',
    'unidad-ingrediente', 'boton-crear-ingrediente', 'error-ingredientes', 'exito-ingredientes',
  ].forEach((id) => {
    assert.notEqual(doc.getElementById(id), null, `falta #${id} en admin.html`);
  });

  // Las tablas y el selector de categorías los llena admin.js: el HTML va vacío.
  ['contenido-usuarios', 'contenido-categorias', 'contenido-platos', 'contenido-ingredientes']
    .forEach((id) => assert.equal(doc.getElementById(id).children.length, 0, `#${id} debía ir vacío`));
  assert.equal(doc.getElementById('categoria-plato').children.length, 0);
});

test('al abrir el panel carga las cuatro secciones con sus datos', async () => {
  const { documento, llamadas } = await montarPanelAdmin();

  assert.deepEqual(
    llamadas.map((llamada) => llamada.ruta).sort(),
    ['/api/categorias', '/api/ingredientes', '/api/platos', '/api/usuarios'],
  );

  // Usuarios: rol traducido, estado y la acción contraria al estado actual.
  assert.deepEqual(filasDe(documento, 'contenido-usuarios'), [
    ['Ana Ríos', 'ana@hotel.co', 'Administrador', 'Activo', 'Desactivar'],
    ['Luis Paz', 'luis@hotel.co', 'Mesero', 'Inactivo', 'Activar'],
  ]);

  // Categorías
  assert.deepEqual(filasDe(documento, 'contenido-categorias'), [['Entradas'], ['Platos fuertes']]);

  // Platos: el nombre de la categoría sale de cruzar categoriaId.
  const filasPlatos = filasDe(documento, 'contenido-platos');
  assert.equal(filasPlatos.length, 2);
  assert.equal(filasPlatos[0][0], 'Bandeja paisa');
  assert.equal(filasPlatos[0][1], 'Platos fuertes');
  assert.match(filasPlatos[0][2], /^\$32[.,\s]?000$/, `precio mal formateado: ${filasPlatos[0][2]}`);
  assert.deepEqual(filasPlatos[0].slice(3), ['Disponible', 'Marcar no disponible']);
  assert.deepEqual(filasPlatos[1].slice(0, 2), ['Sopa de guineo', 'Entradas']);
  assert.deepEqual(filasPlatos[1].slice(3), ['No disponible', 'Marcar disponible']);

  // Ingredientes: stock redondeado a 2 decimales, sin artefactos de coma flotante.
  const filasIngredientes = filasDe(documento, 'contenido-ingredientes');
  assert.deepEqual(filasIngredientes[0].slice(0, 3), ['Arroz', '27.9', 'kg']);
  assert.deepEqual(filasIngredientes[1].slice(0, 3), ['Aguacate', '8', 'unidad']);

  // El selector de categorías del formulario de platos queda poblado y activo.
  const opciones = Array.from(documento.querySelectorAll('#categoria-plato option'))
    .map((opcion) => [opcion.value, opcion.textContent]);
  assert.deepEqual(opciones, [['1', 'Entradas'], ['2', 'Platos fuertes']]);
  assert.equal(documento.getElementById('campos-plato').disabled, false);
  assert.equal(documento.getElementById('boton-crear-plato').disabled, false);
  assert.equal(documento.getElementById('aviso-sin-categorias').hidden, true);

  ['error-usuarios', 'error-categorias', 'error-platos', 'error-ingredientes']
    .forEach((id) => assert.equal(documento.getElementById(id).hidden, true, `no debía haber error en #${id}`));
});

test('crear un usuario hace POST y recarga la tabla', async () => {
  let listado = USUARIOS;
  const nuevo = { id: 3, nombreCompleto: 'Rosa Gil', correo: 'rosa@hotel.co', rol: 'cocina', activo: true, creadoEn: '2026-08-05T09:00:00.000Z' };
  const rutas = rutasPorDefecto({
    '/api/usuarios': (opciones) => {
      if (esMetodo(opciones, 'POST')) {
        listado = USUARIOS.concat(nuevo);
        return respuestaOk(nuevo, 201);
      }
      return respuestaOk(copia(listado));
    },
  });
  const { dom, documento, llamadas } = await montarPanelAdmin(rutas);

  escribir(documento, 'nombre-usuario', '  Rosa Gil  ');
  escribir(documento, 'correo-usuario', 'rosa@hotel.co');
  escribir(documento, 'contrasena-usuario', 'secreta123');
  escribir(documento, 'rol-usuario', 'cocina');
  enviarFormulario(dom, 'formulario-usuario');
  await esperarCiclos();

  const post = llamadas.find((llamada) => esMetodo(llamada.opciones, 'POST'));
  assert.deepEqual(JSON.parse(post.opciones.body), {
    nombreCompleto: 'Rosa Gil',
    correo: 'rosa@hotel.co',
    contrasena: 'secreta123',
    rol: 'cocina',
  });

  // Tras crear se recarga la tabla y se limpia el formulario.
  assert.equal(ultimaLlamada(llamadas).ruta, '/api/usuarios');
  assert.deepEqual(filasDe(documento, 'contenido-usuarios').map((fila) => fila[0]), ['Ana Ríos', 'Luis Paz', 'Rosa Gil']);
  assert.equal(documento.getElementById('nombre-usuario').value, '');
  assert.equal(documento.getElementById('contrasena-usuario').value, '');
  assert.match(textoDe(documento, 'exito-usuarios'), /rosa gil/i);
  assert.equal(documento.getElementById('error-usuarios').hidden, true);
  assert.equal(documento.getElementById('boton-crear-usuario').disabled, false);
});

test('un correo duplicado muestra el mensaje del backend tal cual', async () => {
  const rutas = rutasPorDefecto({
    '/api/usuarios': (opciones) => (esMetodo(opciones, 'POST')
      ? respuestaError(409, 'CORREO_DUPLICADO', 'Ya existe un usuario con el correo ana@hotel.co')
      : respuestaOk(USUARIOS)),
  });
  const { dom, documento } = await montarPanelAdmin(rutas);

  escribir(documento, 'nombre-usuario', 'Ana Ríos');
  escribir(documento, 'correo-usuario', 'ana@hotel.co');
  escribir(documento, 'contrasena-usuario', 'secreta123');
  enviarFormulario(dom, 'formulario-usuario');
  await esperarCiclos();

  const banner = documento.getElementById('error-usuarios');
  assert.equal(banner.hidden, false);
  assert.equal(banner.textContent, 'Ya existe un usuario con el correo ana@hotel.co');
  assert.equal(documento.getElementById('exito-usuarios').hidden, true);
  // El formulario conserva lo escrito para poder corregirlo.
  assert.equal(documento.getElementById('correo-usuario').value, 'ana@hotel.co');
  assert.equal(documento.getElementById('boton-crear-usuario').disabled, false);
});

test('desactivar un usuario pide confirmación y hace PATCH con activo en false', async () => {
  const rutas = rutasPorDefecto({
    '/api/usuarios/1/estado': () => respuestaOk(Object.assign({}, USUARIOS[0], { activo: false })),
  });
  const { dom, documento, llamadas } = await montarPanelAdmin(rutas);

  const fila = filaPorDato(documento, 'contenido-usuarios', 'usuario-id', '1');
  clic(dom, fila.querySelector('button[data-accion="desactivar"]'));

  const dialogo = documento.querySelector('.dialogo-overlay');
  assert.notEqual(dialogo, null, 'debía abrirse el diálogo de confirmación');
  assert.match(dialogo.querySelector('.dialogo-mensaje').textContent, /¿desactivar a ana ríos\?/i);

  clic(dom, dialogo.querySelector('.dialogo-confirmar'));
  await dom.window.Comun._adminAccion;

  const patch = ultimaLlamada(llamadas);
  assert.equal(patch.ruta, '/api/usuarios/1/estado');
  assert.equal(patch.opciones.method, 'PATCH');
  assert.deepEqual(JSON.parse(patch.opciones.body), { activo: false });

  // La fila se repinta con el estado nuevo y la acción contraria.
  assert.deepEqual(filasDe(documento, 'contenido-usuarios')[0].slice(3), ['Inactivo', 'Activar']);
  assert.equal(documento.querySelector('.dialogo-overlay'), null);
});

test('activar un usuario inactivo hace PATCH directo, sin diálogo', async () => {
  const rutas = rutasPorDefecto({
    '/api/usuarios/2/estado': () => respuestaOk(Object.assign({}, USUARIOS[1], { activo: true })),
  });
  const { dom, documento, llamadas } = await montarPanelAdmin(rutas);

  const fila = filaPorDato(documento, 'contenido-usuarios', 'usuario-id', '2');
  clic(dom, fila.querySelector('button[data-accion="activar"]'));
  await dom.window.Comun._adminAccion;

  assert.equal(documento.querySelector('.dialogo-overlay'), null);
  assert.deepEqual(JSON.parse(ultimaLlamada(llamadas).opciones.body), { activo: true });
  assert.deepEqual(filasDe(documento, 'contenido-usuarios')[1].slice(3), ['Activo', 'Desactivar']);
});

test('registrar un huésped hace POST, limpia el formulario y avisa del éxito', async () => {
  const rutas = rutasPorDefecto({
    '/api/huespedes': () => respuestaOk({ id: 9, documento: '1020304050', nombreCompleto: 'Marta Díaz', tipoHuesped: 'vip' }, 201),
  });
  const { dom, documento, llamadas } = await montarPanelAdmin(rutas);

  escribir(documento, 'documento-huesped', '1020304050');
  escribir(documento, 'nombre-huesped', 'Marta Díaz');
  escribir(documento, 'telefono-huesped', '3001234567');
  escribir(documento, 'tipo-huesped', 'vip');
  enviarFormulario(dom, 'formulario-huesped');
  await esperarCiclos();

  const post = ultimaLlamada(llamadas);
  assert.equal(post.ruta, '/api/huespedes');
  assert.equal(post.opciones.method, 'POST');
  assert.deepEqual(JSON.parse(post.opciones.body), {
    documento: '1020304050',
    nombreCompleto: 'Marta Díaz',
    tipoHuesped: 'vip',
    telefono: '3001234567',
  });

  assert.match(textoDe(documento, 'exito-huesped'), /marta díaz/i);
  assert.equal(documento.getElementById('error-huesped').hidden, true);
  assert.equal(documento.getElementById('documento-huesped').value, '');
  assert.equal(documento.getElementById('nombre-huesped').value, '');
  assert.equal(documento.getElementById('telefono-huesped').value, '');
});

test('el teléfono vacío no se envía al backend', async () => {
  const rutas = rutasPorDefecto({ '/api/huespedes': () => respuestaOk({ id: 10 }, 201) });
  const { dom, documento, llamadas } = await montarPanelAdmin(rutas);

  escribir(documento, 'documento-huesped', '55');
  escribir(documento, 'nombre-huesped', 'Pedro Soto');
  enviarFormulario(dom, 'formulario-huesped');
  await esperarCiclos();

  assert.deepEqual(JSON.parse(ultimaLlamada(llamadas).opciones.body), {
    documento: '55',
    nombreCompleto: 'Pedro Soto',
    tipoHuesped: 'ordinario',
  });
});

test('un documento duplicado muestra el mensaje del backend tal cual y conserva el formulario', async () => {
  const rutas = rutasPorDefecto({
    '/api/huespedes': () => respuestaError(409, 'HUESPED_DUPLICADO', 'Ya existe un huésped con el documento 1020304050'),
  });
  const { dom, documento } = await montarPanelAdmin(rutas);

  escribir(documento, 'documento-huesped', '1020304050');
  escribir(documento, 'nombre-huesped', 'Marta Díaz');
  enviarFormulario(dom, 'formulario-huesped');
  await esperarCiclos();

  const banner = documento.getElementById('error-huesped');
  assert.equal(banner.hidden, false);
  assert.equal(banner.textContent, 'Ya existe un huésped con el documento 1020304050');
  assert.equal(documento.getElementById('exito-huesped').hidden, true);
  assert.equal(documento.getElementById('documento-huesped').value, '1020304050');
  assert.equal(documento.getElementById('boton-crear-huesped').disabled, false);
});

test('crear una categoría recarga la tabla y el selector del formulario de platos', async () => {
  let listado = CATEGORIAS;
  const rutas = rutasPorDefecto({
    '/api/categorias': (opciones) => {
      if (esMetodo(opciones, 'POST')) {
        listado = CATEGORIAS.concat({ id: 3, nombre: 'Postres' });
        return respuestaOk({ id: 3, nombre: 'Postres' }, 201);
      }
      return respuestaOk(copia(listado));
    },
  });
  const { dom, documento, llamadas } = await montarPanelAdmin(rutas);

  escribir(documento, 'nombre-categoria', 'Postres');
  enviarFormulario(dom, 'formulario-categoria');
  await esperarCiclos();

  const post = llamadas.find((llamada) => esMetodo(llamada.opciones, 'POST'));
  assert.equal(post.ruta, '/api/categorias');
  assert.deepEqual(JSON.parse(post.opciones.body), { nombre: 'Postres' });

  assert.deepEqual(filasDe(documento, 'contenido-categorias'), [['Entradas'], ['Platos fuertes'], ['Postres']]);
  assert.deepEqual(
    Array.from(documento.querySelectorAll('#categoria-plato option')).map((opcion) => opcion.textContent),
    ['Entradas', 'Platos fuertes', 'Postres'],
  );
  assert.equal(documento.getElementById('nombre-categoria').value, '');
  assert.match(textoDe(documento, 'exito-categorias'), /postres/i);
});

test('sin categorías el formulario de platos queda deshabilitado con su aviso', async () => {
  const rutas = rutasPorDefecto({ '/api/categorias': () => respuestaOk([]) });
  const { documento } = await montarPanelAdmin(rutas);

  assert.equal(documento.getElementById('campos-plato').disabled, true);
  assert.equal(documento.getElementById('boton-crear-plato').disabled, true);
  assert.equal(documento.getElementById('aviso-sin-categorias').hidden, false);
  assert.match(documento.querySelector('#contenido-categorias .texto-vacio').textContent, /no hay categorías/i);
  // Sin categorías la tabla de platos muestra el id como respaldo del nombre.
  assert.equal(filasDe(documento, 'contenido-platos')[0][1], 'Categoría #2');
});

test('crear un plato envía el precio como número y recarga la tabla', async () => {
  let listado = PLATOS;
  const nuevo = { id: 7, categoriaId: 1, nombre: 'Empanadas', precio: 4000, informacion: 'Con ají', disponible: true, creadoEn: '2026-08-05T09:00:00.000Z' };
  const rutas = rutasPorDefecto({
    '/api/platos': (opciones) => {
      if (esMetodo(opciones, 'POST')) {
        listado = PLATOS.concat(nuevo);
        return respuestaOk(nuevo, 201);
      }
      return respuestaOk(copia(listado));
    },
  });
  const { dom, documento, llamadas } = await montarPanelAdmin(rutas);

  escribir(documento, 'nombre-plato', 'Empanadas');
  escribir(documento, 'categoria-plato', '1');
  escribir(documento, 'precio-plato', '4000');
  escribir(documento, 'informacion-plato', 'Con ají');
  enviarFormulario(dom, 'formulario-plato');
  await esperarCiclos();

  const post = llamadas.find((llamada) => esMetodo(llamada.opciones, 'POST'));
  assert.deepEqual(JSON.parse(post.opciones.body), {
    categoriaId: 1,
    nombre: 'Empanadas',
    precio: 4000,
    informacion: 'Con ají',
  });

  assert.deepEqual(filasDe(documento, 'contenido-platos').map((fila) => fila[0]), ['Bandeja paisa', 'Sopa de guineo', 'Empanadas']);
  assert.equal(documento.getElementById('nombre-plato').value, '');
  assert.match(textoDe(documento, 'exito-platos'), /empanadas/i);
  assert.equal(documento.getElementById('boton-crear-plato').disabled, false);
});

test('alternar la disponibilidad de un plato hace PATCH y repinta la fila', async () => {
  const rutas = rutasPorDefecto({
    '/api/platos/5/disponibilidad': () => respuestaOk(Object.assign({}, PLATOS[0], { disponible: false })),
  });
  const { dom, documento, llamadas } = await montarPanelAdmin(rutas);

  const fila = filaPorDato(documento, 'contenido-platos', 'plato-id', '5');
  clic(dom, fila.querySelector('button[data-accion="no-disponible"]'));
  await dom.window.Comun._adminAccion;

  const patch = ultimaLlamada(llamadas);
  assert.equal(patch.ruta, '/api/platos/5/disponibilidad');
  assert.equal(patch.opciones.method, 'PATCH');
  assert.deepEqual(JSON.parse(patch.opciones.body), { disponible: false });

  assert.deepEqual(filasDe(documento, 'contenido-platos')[0].slice(3), ['No disponible', 'Marcar disponible']);
  assert.equal(documento.getElementById('error-platos').hidden, true);
});

test('un error de negocio al alternar disponibilidad se muestra tal cual y deja reintentar', async () => {
  const rutas = rutasPorDefecto({
    '/api/platos/5/disponibilidad': () => respuestaError(422, 'PLATO_SIN_RECETA', 'El plato no tiene receta cargada'),
  });
  const { dom, documento } = await montarPanelAdmin(rutas);

  const fila = filaPorDato(documento, 'contenido-platos', 'plato-id', '5');
  clic(dom, fila.querySelector('button[data-accion="no-disponible"]'));
  await dom.window.Comun._adminAccion;

  const banner = documento.getElementById('error-platos');
  assert.equal(banner.hidden, false);
  assert.equal(banner.textContent, 'El plato no tiene receta cargada');
  assert.deepEqual(filasDe(documento, 'contenido-platos')[0].slice(3), ['Disponible', 'Marcar no disponible']);
  assert.equal(
    filaPorDato(documento, 'contenido-platos', 'plato-id', '5').querySelector('button').disabled,
    false,
  );
});

test('crear un ingrediente envía la cantidad como número y recarga la tabla', async () => {
  let listado = INGREDIENTES;
  const nuevo = { id: 5, nombre: 'Panela', cantidadStock: 12.5, unidadMedida: 'kg', actualizadoEn: '2026-08-05T11:00:00.000Z' };
  const rutas = rutasPorDefecto({
    '/api/ingredientes': (opciones) => {
      if (esMetodo(opciones, 'POST')) {
        listado = INGREDIENTES.concat(nuevo);
        return respuestaOk(nuevo, 201);
      }
      return respuestaOk(copia(listado));
    },
  });
  const { dom, documento, llamadas } = await montarPanelAdmin(rutas);

  escribir(documento, 'nombre-ingrediente', 'Panela');
  escribir(documento, 'cantidad-ingrediente', '12.5');
  escribir(documento, 'unidad-ingrediente', 'kg');
  enviarFormulario(dom, 'formulario-ingrediente');
  await esperarCiclos();

  const post = llamadas.find((llamada) => esMetodo(llamada.opciones, 'POST'));
  assert.deepEqual(JSON.parse(post.opciones.body), { nombre: 'Panela', cantidadStock: 12.5, unidadMedida: 'kg' });

  assert.deepEqual(
    filasDe(documento, 'contenido-ingredientes').map((fila) => fila.slice(0, 3)),
    [['Arroz', '27.9', 'kg'], ['Aguacate', '8', 'unidad'], ['Panela', '12.5', 'kg']],
  );
  assert.equal(documento.getElementById('nombre-ingrediente').value, '');
  assert.match(textoDe(documento, 'exito-ingredientes'), /panela/i);
});

test('actualizar el stock de un ingrediente hace PATCH con el valor absoluto', async () => {
  const rutas = rutasPorDefecto({
    '/api/ingredientes/3/stock': () => respuestaOk(Object.assign({}, INGREDIENTES[0], { cantidadStock: 50 })),
  });
  const { dom, documento, llamadas } = await montarPanelAdmin(rutas);

  const fila = filaPorDato(documento, 'contenido-ingredientes', 'ingrediente-id', '3');
  const entrada = fila.querySelector('input');
  assert.equal(entrada.value, '27.9', 'el input arranca con el stock actual redondeado');

  entrada.value = '50';
  clic(dom, fila.querySelector('button[data-accion="actualizar-stock"]'));
  await dom.window.Comun._adminAccion;

  const patch = ultimaLlamada(llamadas);
  assert.equal(patch.ruta, '/api/ingredientes/3/stock');
  assert.equal(patch.opciones.method, 'PATCH');
  assert.deepEqual(JSON.parse(patch.opciones.body), { cantidadStock: 50 });

  assert.deepEqual(filasDe(documento, 'contenido-ingredientes')[0].slice(0, 3), ['Arroz', '50', 'kg']);
  assert.match(textoDe(documento, 'exito-ingredientes'), /arroz/i);
  assert.equal(documento.getElementById('error-ingredientes').hidden, true);
});

test('un stock vacío no llega al backend y avisa en la sección', async () => {
  const { dom, documento, llamadas } = await montarPanelAdmin();
  const llamadasIniciales = llamadas.length;

  const fila = filaPorDato(documento, 'contenido-ingredientes', 'ingrediente-id', '3');
  fila.querySelector('input').value = '';
  clic(dom, fila.querySelector('button[data-accion="actualizar-stock"]'));
  await dom.window.Comun._adminAccion;

  assert.equal(llamadas.length, llamadasIniciales, 'no debía hacerse ninguna petición');
  assert.equal(documento.getElementById('error-ingredientes').hidden, false);
  assert.match(textoDe(documento, 'error-ingredientes'), /cantidad de stock válida/i);
});

test('el botón de envío queda deshabilitado mientras la petición está en curso', async () => {
  let liberar;
  const rutas = rutasPorDefecto({
    '/api/huespedes': () => new Promise((resolve) => { liberar = () => resolve(respuestaOk({ id: 9 }, 201)); }),
  });
  const { dom, documento } = await montarPanelAdmin(rutas);

  escribir(documento, 'documento-huesped', '77');
  escribir(documento, 'nombre-huesped', 'Sara Lima');
  enviarFormulario(dom, 'formulario-huesped');
  await esperarCiclos(2);

  assert.equal(documento.getElementById('boton-crear-huesped').disabled, true);

  liberar();
  await esperarCiclos();

  assert.equal(documento.getElementById('boton-crear-huesped').disabled, false);
  assert.match(textoDe(documento, 'exito-huesped'), /sara lima/i);
});

test('un fallo de red al cargar los ingredientes no tumba las otras secciones', async () => {
  const rutas = rutasPorDefecto({ '/api/ingredientes': () => { throw new Error('fallo de red'); } });
  const { documento } = await montarPanelAdmin(rutas);

  const banner = documento.getElementById('error-ingredientes');
  assert.equal(banner.hidden, false);
  assert.match(banner.textContent, /no se pudo conectar/i);
  assert.equal(documento.querySelector('#contenido-ingredientes table'), null);

  assert.equal(documento.getElementById('error-usuarios').hidden, true);
  assert.equal(filasDe(documento, 'contenido-usuarios').length, 2);
  assert.equal(filasDe(documento, 'contenido-platos').length, 2);
  assert.equal(filasDe(documento, 'contenido-categorias').length, 2);
});

test('un fallo al listar usuarios muestra el mensaje del backend sin afectar al menú', async () => {
  const rutas = rutasPorDefecto({
    '/api/usuarios': () => respuestaError(500, 'ERROR_INTERNO', 'No se pudo listar los usuarios.'),
  });
  const { documento } = await montarPanelAdmin(rutas);

  const banner = documento.getElementById('error-usuarios');
  assert.equal(banner.hidden, false);
  assert.equal(banner.textContent, 'No se pudo listar los usuarios.');
  assert.equal(documento.querySelector('#contenido-usuarios table'), null);

  assert.equal(filasDe(documento, 'contenido-platos').length, 2);
  assert.equal(filasDe(documento, 'contenido-ingredientes').length, 2);
});
