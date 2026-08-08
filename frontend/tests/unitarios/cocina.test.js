// frontend/tests/unitarios/cocina.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { crearDom, ejecutarScript } = require('../ayudas/dom');

const RUTA_COCINA_HTML = path.join(__dirname, '../../public/cocina.html');
const RUTA_DIALOGO = path.join(__dirname, '../../public/js/comun/dialogo.js');
const RUTA_CLIENTE_API = path.join(__dirname, '../../public/js/comun/clienteApi.js');
const RUTA_PANEL = path.join(__dirname, '../../public/js/comun/panel.js');
const RUTA_COCINA_JS = path.join(__dirname, '../../public/js/cocina.js');

const RUTA_PENDIENTES = '/api/pedidos?estado=pendiente';
const RUTA_EN_PREPARACION = '/api/pedidos?estado=en_preparacion';

const USUARIO_COCINA = { id: 3, nombreCompleto: 'Rosa Gil', rol: 'cocina' };

const PLATOS = [
  { id: 1, categoriaId: 1, nombre: 'Caldo de costilla', precio: 12000, informacion: '', disponible: true },
  { id: 2, categoriaId: 2, nombre: 'Bandeja paisa', precio: 32000, informacion: '', disponible: true },
];

const PEDIDO_PENDIENTE_11 = {
  id: 11,
  huespedId: 42,
  usuarioId: 7,
  franja: 'almuerzo',
  estado: 'pendiente',
  creadoEn: '2026-08-05T12:00:00.000Z',
  items: [
    { id: 1, platoId: 1, cantidad: 2, precioUnitario: 12000 },
    { id: 2, platoId: 2, cantidad: 1, precioUnitario: 32000 },
  ],
};

const PEDIDO_PENDIENTE_12 = {
  id: 12,
  huespedId: 8,
  usuarioId: 7,
  franja: 'cena',
  estado: 'pendiente',
  creadoEn: '2026-08-05T12:05:00.000Z',
  items: [{ id: 3, platoId: 2, cantidad: 3, precioUnitario: 32000 }],
};

const PEDIDO_EN_PREPARACION_9 = {
  id: 9,
  huespedId: 15,
  usuarioId: 7,
  franja: 'desayuno',
  estado: 'en_preparacion',
  creadoEn: '2026-08-05T07:30:00.000Z',
  items: [{ id: 4, platoId: 1, cantidad: 1, precioUnitario: 12000 }],
};

function respuestaOk(cuerpo) {
  return { status: 200, ok: true, json: async () => cuerpo };
}

function respuestaError(status, codigo, mensaje) {
  return { status, ok: false, json: async () => ({ error: { codigo, mensaje } }) };
}

function rutasPorDefecto() {
  return {
    '/api/platos': () => respuestaOk(PLATOS),
    [RUTA_PENDIENTES]: () => respuestaOk([PEDIDO_PENDIENTE_11, PEDIDO_PENDIENTE_12]),
    [RUTA_EN_PREPARACION]: () => respuestaOk([PEDIDO_EN_PREPARACION_9]),
  };
}

// El panel arranca un setInterval real (para el cronómetro de las
// tarjetas) que JSDOM no limpia solo — sin cerrarlo, el proceso de test
// nunca drena su event loop y `npm test` se cuelga. `domActual` guarda
// la ventana del montaje más reciente para que el afterEach de abajo la
// cierre después de cada test.
let domActual = null;

// Monta cocina.html con dialogo/clienteApi/panel reales y stubs de sesion/header.
// `rutas` mapea la ruta pedida a una función (opciones) => respuesta simulada.
async function montarPanelCocina(rutas = rutasPorDefecto()) {
  const dom = crearDom(RUTA_COCINA_HTML);
  domActual = dom;
  const llamadas = [];

  dom.window.Comun = {
    sesion: { verificar: async () => USUARIO_COCINA },
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
  ejecutarScript(dom, RUTA_COCINA_JS);

  await dom.window.Comun._panelListo;
  await dom.window.Comun._cocinaCargando;

  return { dom, documento: dom.window.document, llamadas };
}

// Cierra la ventana JSDOM del test anterior: detiene el setInterval real
// del cronómetro (window.close() sí lo limpia, verificado) para que el
// proceso de `node --test` pueda salir en vez de quedarse colgado.
test.afterEach(() => {
  if (domActual) {
    domActual.window.close();
    domActual = null;
  }
});

function clic(dom, elemento) {
  elemento.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
}

function tarjetasDe(documento, idCola) {
  return Array.from(documento.querySelectorAll(`#${idCola} .tarjeta-pedido`))
    .map((tarjeta) => tarjeta.dataset.pedidoId);
}

function tarjetaDe(documento, idPedido) {
  return documento.querySelector(`.tarjeta-pedido[data-pedido-id="${idPedido}"]`);
}

function botonDe(tarjeta, accion) {
  return tarjeta.querySelector(`button[data-accion="${accion}"]`);
}

function textosDeItems(tarjeta) {
  return Array.from(tarjeta.querySelectorAll('.tarjeta-pedido-items li'))
    .map((fila) => fila.textContent);
}

test('renderiza las dos colas con una llamada por estado y el nombre del plato cruzado', async () => {
  const { documento, llamadas } = await montarPanelCocina();

  assert.deepEqual(
    llamadas.map((llamada) => llamada.ruta).sort(),
    ['/api/pedidos?estado=en_preparacion', '/api/pedidos?estado=pendiente', '/api/platos'],
  );

  // FIFO: el más viejo primero, tal como los devuelve el backend.
  assert.deepEqual(tarjetasDe(documento, 'cola-pendientes'), ['11', '12']);
  assert.deepEqual(tarjetasDe(documento, 'cola-en-preparacion'), ['9']);

  const tarjeta11 = tarjetaDe(documento, '11');
  assert.equal(tarjeta11.querySelector('.tarjeta-pedido-numero').textContent, 'Pedido #11');
  assert.equal(tarjeta11.querySelector('.insignia-franja').textContent, 'Almuerzo');
  assert.equal(tarjeta11.querySelector('.tarjeta-pedido-huesped').textContent, 'Huésped #42');
  assert.deepEqual(textosDeItems(tarjeta11), ['Caldo de costilla x 2', 'Bandeja paisa x 1']);

  // Cada columna ofrece solo las transiciones válidas para cocina.
  assert.equal(botonDe(tarjeta11, 'en_preparacion').textContent, 'Iniciar preparación');
  assert.equal(botonDe(tarjeta11, 'cancelado').textContent, 'Cancelar');
  assert.equal(botonDe(tarjeta11, 'listo'), null);

  const tarjeta9 = tarjetaDe(documento, '9');
  assert.equal(botonDe(tarjeta9, 'listo').textContent, 'Marcar listo');
  assert.equal(botonDe(tarjeta9, 'cancelado').textContent, 'Cancelar');
  assert.equal(botonDe(tarjeta9, 'en_preparacion'), null);

  assert.equal(documento.getElementById('error-cocina').hidden, true);
});

test('"Iniciar preparación" hace PATCH y mueve la tarjeta a la cola de en preparación', async () => {
  const rutas = rutasPorDefecto();
  rutas['/api/pedidos/11/estado'] = () => respuestaOk(
    Object.assign({}, PEDIDO_PENDIENTE_11, { estado: 'en_preparacion' }),
  );
  const { dom, documento, llamadas } = await montarPanelCocina(rutas);

  clic(dom, botonDe(tarjetaDe(documento, '11'), 'en_preparacion'));
  await dom.window.Comun._cocinaAccion;

  const patch = llamadas[llamadas.length - 1];
  assert.equal(patch.ruta, '/api/pedidos/11/estado');
  assert.equal(patch.opciones.method, 'PATCH');
  assert.deepEqual(JSON.parse(patch.opciones.body), { estado: 'en_preparacion' });

  assert.deepEqual(tarjetasDe(documento, 'cola-pendientes'), ['12']);
  // Se reinserta respetando el orden FIFO: el pedido #9 es más viejo.
  assert.deepEqual(tarjetasDe(documento, 'cola-en-preparacion'), ['9', '11']);

  // Ya en la nueva columna, la tarjeta ofrece las acciones de "en preparación".
  const tarjeta11 = tarjetaDe(documento, '11');
  assert.equal(botonDe(tarjeta11, 'listo').textContent, 'Marcar listo');
  assert.equal(botonDe(tarjeta11, 'en_preparacion'), null);
  assert.equal(documento.getElementById('error-cocina').hidden, true);
});

test('"Marcar listo" saca la tarjeta del tablero y deja el aviso de cola vacía', async () => {
  const rutas = rutasPorDefecto();
  rutas['/api/pedidos/9/estado'] = () => respuestaOk(
    Object.assign({}, PEDIDO_EN_PREPARACION_9, { estado: 'listo' }),
  );
  const { dom, documento } = await montarPanelCocina(rutas);

  clic(dom, botonDe(tarjetaDe(documento, '9'), 'listo'));
  await dom.window.Comun._cocinaAccion;

  assert.deepEqual(tarjetasDe(documento, 'cola-en-preparacion'), []);
  assert.match(
    documento.querySelector('#cola-en-preparacion .texto-vacio').textContent,
    /no hay pedidos en preparación/i,
  );
  assert.deepEqual(tarjetasDe(documento, 'cola-pendientes'), ['11', '12']);
});

test('"Cancelar" no llama al API si no se confirma en el diálogo', async () => {
  const { dom, documento, llamadas } = await montarPanelCocina();
  const llamadasIniciales = llamadas.length;

  clic(dom, botonDe(tarjetaDe(documento, '11'), 'cancelado'));

  const dialogo = documento.querySelector('.dialogo-overlay');
  assert.notEqual(dialogo, null, 'debía abrirse el diálogo de confirmación');
  assert.match(dialogo.querySelector('.dialogo-mensaje').textContent, /¿cancelar este pedido\?/i);

  clic(dom, dialogo.querySelector('.dialogo-cancelar'));
  await dom.window.Comun._cocinaAccion;

  assert.equal(llamadas.length, llamadasIniciales, 'no debía hacerse ninguna petición');
  assert.equal(documento.querySelector('.dialogo-overlay'), null);
  assert.deepEqual(tarjetasDe(documento, 'cola-pendientes'), ['11', '12']);
});

test('"Cancelar" confirmado hace PATCH con estado cancelado y quita la tarjeta de la cola', async () => {
  const rutas = rutasPorDefecto();
  rutas['/api/pedidos/11/estado'] = () => respuestaOk(
    Object.assign({}, PEDIDO_PENDIENTE_11, { estado: 'cancelado' }),
  );
  const { dom, documento, llamadas } = await montarPanelCocina(rutas);

  clic(dom, botonDe(tarjetaDe(documento, '11'), 'cancelado'));
  clic(dom, documento.querySelector('.dialogo-overlay .dialogo-confirmar'));
  await dom.window.Comun._cocinaAccion;

  const patch = llamadas[llamadas.length - 1];
  assert.equal(patch.ruta, '/api/pedidos/11/estado');
  assert.equal(patch.opciones.method, 'PATCH');
  assert.deepEqual(JSON.parse(patch.opciones.body), { estado: 'cancelado' });

  assert.equal(documento.querySelector('.dialogo-overlay'), null);
  assert.deepEqual(tarjetasDe(documento, 'cola-pendientes'), ['12']);
  // Un pedido cancelado no reaparece en la otra columna.
  assert.deepEqual(tarjetasDe(documento, 'cola-en-preparacion'), ['9']);
});

test('un error de negocio en la transición muestra el mensaje del backend tal cual y conserva la tarjeta', async () => {
  const rutas = rutasPorDefecto();
  rutas['/api/pedidos/11/estado'] = () => respuestaError(403, 'NO_AUTORIZADO', 'No tiene permiso para esta acción');
  const { dom, documento } = await montarPanelCocina(rutas);

  clic(dom, botonDe(tarjetaDe(documento, '11'), 'en_preparacion'));
  await dom.window.Comun._cocinaAccion;

  const banner = documento.getElementById('error-cocina');
  assert.equal(banner.hidden, false);
  assert.equal(banner.textContent, 'No tiene permiso para esta acción');
  assert.deepEqual(tarjetasDe(documento, 'cola-pendientes'), ['11', '12']);
  // El botón vuelve a quedar disponible para reintentar.
  assert.equal(botonDe(tarjetaDe(documento, '11'), 'en_preparacion').disabled, false);
});

test('sin pedidos en ninguna cola muestra los avisos de vacío en vez de secciones en blanco', async () => {
  const rutas = rutasPorDefecto();
  rutas[RUTA_PENDIENTES] = () => respuestaOk([]);
  rutas[RUTA_EN_PREPARACION] = () => respuestaOk([]);
  const { documento } = await montarPanelCocina(rutas);

  assert.match(documento.querySelector('#cola-pendientes .texto-vacio').textContent, /no hay pedidos pendientes/i);
  assert.match(documento.querySelector('#cola-en-preparacion .texto-vacio').textContent, /no hay pedidos en preparación/i);
  assert.equal(documento.querySelector('.tarjeta-pedido'), null);
});

test('un fallo de red al cargar las colas muestra un mensaje genérico propio', async () => {
  const rutas = rutasPorDefecto();
  rutas[RUTA_PENDIENTES] = () => { throw new Error('fallo de red'); };
  const { documento } = await montarPanelCocina(rutas);

  const banner = documento.getElementById('error-cocina');
  assert.equal(banner.hidden, false);
  assert.match(banner.textContent, /no se pudo conectar/i);
  assert.equal(documento.querySelector('.tarjeta-pedido'), null);
});

test('si falla el catálogo de platos, las tarjetas siguen mostrándose usando el id del plato', async () => {
  const rutas = rutasPorDefecto();
  rutas['/api/platos'] = () => respuestaError(500, 'ERROR_INTERNO', 'Error interno.');
  const { documento } = await montarPanelCocina(rutas);

  assert.equal(documento.getElementById('error-cocina').hidden, true);
  assert.deepEqual(textosDeItems(tarjetaDe(documento, '11')), ['Plato #1 x 2', 'Plato #2 x 1']);
});

test('el botón "Actualizar" vuelve a pedir ambas colas y refresca el tablero', async () => {
  const rutas = rutasPorDefecto();
  let pendientes = [PEDIDO_PENDIENTE_11, PEDIDO_PENDIENTE_12];
  rutas[RUTA_PENDIENTES] = () => respuestaOk(pendientes);
  const { dom, documento, llamadas } = await montarPanelCocina(rutas);

  assert.equal(llamadas.length, 3);

  pendientes = [PEDIDO_PENDIENTE_12];
  clic(dom, documento.getElementById('boton-actualizar-pedidos'));
  await dom.window.Comun._cocinaCargando;

  // Solo dos llamadas más: el catálogo de platos se carga una única vez.
  assert.equal(llamadas.length, 5);
  assert.deepEqual(tarjetasDe(documento, 'cola-pendientes'), ['12']);
  assert.deepEqual(tarjetasDe(documento, 'cola-en-preparacion'), ['9']);
  assert.equal(documento.getElementById('boton-actualizar-pedidos').disabled, false);
});

test('el badge de cronómetro se pinta correctamente según minutos transcurridos', async () => {
  const { dom, documento } = await montarPanelCocina();
  const ahora = new Date('2026-08-05T12:09:00.000Z'); // 9 min después del pedido 11 (creado 12:00:00)

  dom.window.Comun._actualizarCronometros(ahora);

  const badge = tarjetaDe(documento, '11').querySelector('.tarjeta-pedido-cronometro');
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, '9 min');
  assert.equal(badge.dataset.urgencia, 'baja');
});

test('el badge pasa a "media" a los 10 minutos exactos', async () => {
  const { dom, documento } = await montarPanelCocina();
  const ahora = new Date('2026-08-05T12:10:00.000Z'); // 10 min exactos

  dom.window.Comun._actualizarCronometros(ahora);

  const badge = tarjetaDe(documento, '11').querySelector('.tarjeta-pedido-cronometro');
  assert.equal(badge.dataset.urgencia, 'media');
});

test('el badge pasa a "alta" a los 20 minutos exactos', async () => {
  const { dom, documento } = await montarPanelCocina();
  const ahora = new Date('2026-08-05T12:20:00.000Z'); // 20 min exactos

  dom.window.Comun._actualizarCronometros(ahora);

  const badge = tarjetaDe(documento, '11').querySelector('.tarjeta-pedido-cronometro');
  assert.equal(badge.dataset.urgencia, 'alta');
});

test('un creadoEn en el futuro nunca muestra minutos negativos', async () => {
  const { dom, documento } = await montarPanelCocina();
  // Pedido 12 fue creado a las 12:05; "ahora" queda 5 min antes por desfase de reloj.
  const ahora = new Date('2026-08-05T12:00:00.000Z');

  dom.window.Comun._actualizarCronometros(ahora);

  const badge = tarjetaDe(documento, '12').querySelector('.tarjeta-pedido-cronometro');
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, '0 min');
  assert.equal(badge.dataset.urgencia, 'baja');
});

test('un creadoEn inválido oculta el badge sin afectar el resto de la tarjeta', async () => {
  const rutas = rutasPorDefecto();
  rutas[RUTA_PENDIENTES] = () => respuestaOk([
    Object.assign({}, PEDIDO_PENDIENTE_11, { creadoEn: 'no-es-una-fecha' }),
  ]);
  const { documento } = await montarPanelCocina(rutas);

  const tarjeta = tarjetaDe(documento, '11');
  const badge = tarjeta.querySelector('.tarjeta-pedido-cronometro');
  assert.equal(badge.hidden, true);
  // El resto de la tarjeta sigue intacto.
  assert.equal(tarjeta.querySelector('.tarjeta-pedido-numero').textContent, 'Pedido #11');
  assert.equal(botonDe(tarjeta, 'en_preparacion').textContent, 'Iniciar preparación');
});

test('una tarjeta recién renderizada ya trae su cronómetro pintado, sin esperar el primer tick', async () => {
  const { documento } = await montarPanelCocina();

  const badge = tarjetaDe(documento, '11').querySelector('.tarjeta-pedido-cronometro');
  assert.equal(badge.hidden, false);
  assert.match(badge.textContent, /^\d+ min$/);
});
