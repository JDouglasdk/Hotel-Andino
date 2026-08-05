// frontend/tests/unitarios/jefeDeCaja.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { crearDom, ejecutarScript } = require('../ayudas/dom');

const RUTA_PAGINA = path.join(__dirname, '../../public/jefeDeCaja.html');
const RUTA_CLIENTE_API = path.join(__dirname, '../../public/js/comun/clienteApi.js');
const RUTA_PANEL = path.join(__dirname, '../../public/js/comun/panel.js');
const RUTA_JEFE_DE_CAJA = path.join(__dirname, '../../public/js/jefeDeCaja.js');

const CAJA_DEL_DIA = { total: 1234567, cantidadPedidos: 12 };
const PLATOS_POR_FRANJA = { almuerzo: { 3: 5, 7: 2 }, cena: { 3: 1 } };
const PLATOS = [
  { id: 3, categoriaId: 1, nombre: 'Bandeja paisa', precio: 32000, informacion: '', disponible: true },
  { id: 7, categoriaId: 1, nombre: 'Ajiaco', precio: 28000, informacion: '', disponible: true },
];
const INGREDIENTES = [
  { id: 1, nombre: 'Arroz', cantidadStock: 40, unidadMedida: 'kg', actualizadoEn: '2026-08-05T10:00:00.000Z' },
  { id: 2, nombre: 'Aguacate', cantidadStock: 8, unidadMedida: 'unidad', actualizadoEn: '2026-08-05T10:00:00.000Z' },
];

function respuestaOk(cuerpo) {
  return { status: 200, ok: true, json: async () => cuerpo };
}

function respuestaError(status, codigo, mensaje) {
  return { status, ok: false, json: async () => ({ error: { codigo, mensaje } }) };
}

function respuestasPorDefecto() {
  return {
    '/api/reportes/caja-del-dia': () => respuestaOk(CAJA_DEL_DIA),
    '/api/reportes/platos-por-franja': () => respuestaOk(PLATOS_POR_FRANJA),
    '/api/platos': () => respuestaOk(PLATOS),
    '/api/ingredientes': () => respuestaOk(INGREDIENTES),
  };
}

function montarPanel(respuestas = respuestasPorDefecto()) {
  const dom = crearDom(RUTA_PAGINA);
  const rutasPedidas = [];

  dom.window.Comun = {
    sesion: { verificar: async () => ({ nombreCompleto: 'Beto Ruiz', rol: 'jefeDeCaja' }) },
    header: { construir: () => {} },
  };
  dom.window.fetch = async (ruta) => {
    rutasPedidas.push(ruta);
    const responder = respuestas[ruta];
    if (!responder) return respuestaError(404, 'NO_ENCONTRADO', 'Ruta no simulada: ' + ruta);
    return responder();
  };

  ejecutarScript(dom, RUTA_CLIENTE_API);
  ejecutarScript(dom, RUTA_PANEL);
  ejecutarScript(dom, RUTA_JEFE_DE_CAJA);

  return { dom, rutasPedidas };
}

async function esperarCarga(dom) {
  await dom.window.Comun._panelListo;
  await dom.window.Comun._jefeDeCajaCargando;
}

function textoDe(dom, selector) {
  const elemento = dom.window.document.querySelector(selector);
  return elemento === null ? null : elemento.textContent;
}

function filasDe(dom, selector) {
  return Array.from(dom.window.document.querySelectorAll(selector + ' tbody tr'))
    .map((fila) => Array.from(fila.querySelectorAll('td')).map((celda) => celda.textContent));
}

test('carga las tres secciones y muestra caja del día, platos por franja e inventario', async () => {
  const { dom, rutasPedidas } = montarPanel();

  await esperarCarga(dom);

  // Caja del día
  const valores = Array.from(dom.window.document.querySelectorAll('#resumen-caja-del-dia .tarjeta-resumen-valor'))
    .map((elemento) => elemento.textContent);
  assert.equal(valores.length, 2);
  assert.match(valores[0], /^\$1[.,\s]?234[.,\s]?567$/, `total mal formateado: ${valores[0]}`);
  assert.equal(valores[1], '12');

  // Platos por franja: solo las franjas con pedidos, con el nombre cruzado desde /api/platos
  const franjas = Array.from(dom.window.document.querySelectorAll('#contenido-platos-por-franja .bloque-franja'))
    .map((bloque) => bloque.dataset.franja);
  assert.deepEqual(franjas, ['almuerzo', 'cena']);
  assert.deepEqual(
    filasDe(dom, '.bloque-franja[data-franja="almuerzo"]'),
    [['Bandeja paisa', '5'], ['Ajiaco', '2']],
  );
  assert.deepEqual(filasDe(dom, '.bloque-franja[data-franja="cena"]'), [['Bandeja paisa', '1']]);

  // Inventario (solo lectura: sin inputs ni botones dentro de la tabla)
  assert.deepEqual(
    filasDe(dom, '#contenido-inventario'),
    [['Arroz', '40', 'kg'], ['Aguacate', '8', 'unidad']],
  );
  assert.equal(dom.window.document.querySelector('#contenido-inventario input'), null);
  assert.equal(dom.window.document.querySelector('#contenido-inventario button'), null);

  assert.deepEqual(rutasPedidas.slice().sort(), [
    '/api/ingredientes',
    '/api/platos',
    '/api/reportes/caja-del-dia',
    '/api/reportes/platos-por-franja',
  ]);
  ['error-caja-del-dia', 'error-platos-por-franja', 'error-inventario'].forEach((id) => {
    assert.equal(dom.window.document.getElementById(id).hidden, true, `no debía haber error en #${id}`);
  });
});

test('un fallo en caja del día muestra el mensaje del backend sin romper las otras dos secciones', async () => {
  const respuestas = respuestasPorDefecto();
  respuestas['/api/reportes/caja-del-dia'] = () => respuestaError(500, 'ERROR_INTERNO', 'No se pudo calcular la caja del día.');
  const { dom } = montarPanel(respuestas);

  await esperarCarga(dom);

  const banner = dom.window.document.getElementById('error-caja-del-dia');
  assert.equal(banner.hidden, false);
  assert.equal(banner.textContent, 'No se pudo calcular la caja del día.');
  assert.equal(dom.window.document.querySelector('#resumen-caja-del-dia .tarjeta-resumen'), null);

  // Las otras dos secciones siguen funcionando
  assert.equal(dom.window.document.getElementById('error-platos-por-franja').hidden, true);
  assert.equal(dom.window.document.getElementById('error-inventario').hidden, true);
  assert.deepEqual(filasDe(dom, '.bloque-franja[data-franja="cena"]'), [['Bandeja paisa', '1']]);
  assert.deepEqual(
    filasDe(dom, '#contenido-inventario'),
    [['Arroz', '40', 'kg'], ['Aguacate', '8', 'unidad']],
  );
});

test('un fallo de red en el inventario no bloquea la caja del día ni los platos por franja', async () => {
  const respuestas = respuestasPorDefecto();
  respuestas['/api/ingredientes'] = () => { throw new Error('fallo de red'); };
  const { dom } = montarPanel(respuestas);

  await esperarCarga(dom);

  const banner = dom.window.document.getElementById('error-inventario');
  assert.equal(banner.hidden, false);
  assert.match(banner.textContent, /no se pudo conectar/i);
  assert.equal(dom.window.document.querySelector('#contenido-inventario table'), null);

  assert.equal(dom.window.document.getElementById('error-caja-del-dia').hidden, true);
  assert.equal(textoDe(dom, '#resumen-caja-del-dia .tarjeta-resumen-valor--destacado').startsWith('$'), true);
  assert.equal(dom.window.document.querySelectorAll('.bloque-franja').length, 2);
});

test('si falla el catálogo de platos, el reporte por franja se muestra igual usando el id como respaldo', async () => {
  const respuestas = respuestasPorDefecto();
  respuestas['/api/platos'] = () => respuestaError(500, 'ERROR_INTERNO', 'Error interno.');
  const { dom } = montarPanel(respuestas);

  await esperarCarga(dom);

  assert.equal(dom.window.document.getElementById('error-platos-por-franja').hidden, true);
  assert.deepEqual(
    filasDe(dom, '.bloque-franja[data-franja="almuerzo"]'),
    [['Plato #3', '5'], ['Plato #7', '2']],
  );
});

test('sin pedidos entregados hoy muestra el aviso de vacío y el total en cero', async () => {
  const respuestas = respuestasPorDefecto();
  respuestas['/api/reportes/caja-del-dia'] = () => respuestaOk({ total: 0, cantidadPedidos: 0 });
  respuestas['/api/reportes/platos-por-franja'] = () => respuestaOk({});
  const { dom } = montarPanel(respuestas);

  await esperarCarga(dom);

  assert.equal(textoDe(dom, '#resumen-caja-del-dia .tarjeta-resumen-valor--destacado'), '$0');
  assert.equal(dom.window.document.querySelectorAll('.bloque-franja').length, 0);
  assert.match(textoDe(dom, '#contenido-platos-por-franja .texto-vacio'), /todavía no hay platos servidos/i);
});

test('la cantidad en stock se redondea a 2 decimales, sin artefactos de punto flotante', async () => {
  const respuestas = respuestasPorDefecto();
  respuestas['/api/ingredientes'] = () => respuestaOk([
    { id: 1, nombre: 'Papa', cantidadStock: 27.9000000000000002, unidadMedida: 'kg', actualizadoEn: '2026-08-05T10:00:00.000Z' },
    { id: 2, nombre: 'Arroz', cantidadStock: 49.5, unidadMedida: 'kg', actualizadoEn: '2026-08-05T10:00:00.000Z' },
    { id: 3, nombre: 'Sal', cantidadStock: 10, unidadMedida: 'kg', actualizadoEn: '2026-08-05T10:00:00.000Z' },
  ]);
  const { dom } = montarPanel(respuestas);

  await esperarCarga(dom);

  assert.deepEqual(
    filasDe(dom, '#contenido-inventario'),
    [['Papa', '27.9', 'kg'], ['Arroz', '49.5', 'kg'], ['Sal', '10', 'kg']],
  );
});

test('el botón "Actualizar" vuelve a pedir los reportes y refresca los datos', async () => {
  const respuestas = respuestasPorDefecto();
  let totalActual = 1000;
  respuestas['/api/reportes/caja-del-dia'] = () => respuestaOk({ total: totalActual, cantidadPedidos: 1 });
  const { dom, rutasPedidas } = montarPanel(respuestas);

  await esperarCarga(dom);
  assert.equal(rutasPedidas.length, 4);

  totalActual = 2000;
  dom.window.document.getElementById('boton-actualizar-reportes')
    .dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await esperarCarga(dom);

  assert.equal(rutasPedidas.length, 8);
  assert.match(textoDe(dom, '#resumen-caja-del-dia .tarjeta-resumen-valor--destacado'), /2[.,]?000$/);
  assert.equal(dom.window.document.getElementById('boton-actualizar-reportes').disabled, false);
  assert.equal(dom.window.document.querySelectorAll('#resumen-caja-del-dia .tarjeta-resumen').length, 2);
});
