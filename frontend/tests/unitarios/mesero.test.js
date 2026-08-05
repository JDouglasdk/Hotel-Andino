// frontend/tests/unitarios/mesero.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { crearDom, ejecutarScript } = require('../ayudas/dom');

const RUTA_MESERO_HTML = path.join(__dirname, '../../public/mesero.html');
const RUTA_CLIENTE_API = path.join(__dirname, '../../public/js/comun/clienteApi.js');
const RUTA_PANEL = path.join(__dirname, '../../public/js/comun/panel.js');
const RUTA_MESERO_JS = path.join(__dirname, '../../public/js/mesero.js');

const USUARIO_MESERO = { id: 7, nombreCompleto: 'Luis Mesa', rol: 'mesero' };

const PLATOS = [
  { id: 1, categoriaId: 1, nombre: 'Caldo de costilla', precio: 12000, informacion: '', disponible: true },
  { id: 2, categoriaId: 2, nombre: 'Bandeja paisa', precio: 32000, informacion: '', disponible: true },
];

const HUESPED = {
  id: 42,
  documento: '1020304050',
  nombreCompleto: 'Ana Torres',
  telefono: '3001234567',
  tipoHuesped: 'ejecutivo',
};

function respuestaOk(cuerpo) {
  return { status: 200, ok: true, json: async () => cuerpo };
}

function respuestaError(status, codigo, mensaje) {
  return { status, ok: false, json: async () => ({ error: { codigo, mensaje } }) };
}

// Monta mesero.html con clienteApi + panel reales y stubs de sesion/header.
// `rutas` mapea la ruta pedida a una función (opciones) => respuesta simulada.
async function montarPanelMesero({ rutas }) {
  const dom = crearDom(RUTA_MESERO_HTML);
  const llamadas = [];

  dom.window.Comun = {
    sesion: { verificar: async () => USUARIO_MESERO },
    header: { construir: () => {} },
  };

  dom.window.fetch = async (ruta, opciones) => {
    llamadas.push({ ruta, opciones });
    const manejador = rutas[ruta];
    if (!manejador) throw new Error(`ruta inesperada: ${ruta}`);
    return manejador(opciones);
  };

  ejecutarScript(dom, RUTA_CLIENTE_API);
  ejecutarScript(dom, RUTA_PANEL);
  ejecutarScript(dom, RUTA_MESERO_JS);

  await dom.window.Comun._panelListo;
  await dom.window.Comun._meseroPlatosListo;

  return { dom, documento: dom.window.document, llamadas };
}

function enviarFormulario(dom, id) {
  dom.window.document.getElementById(id)
    .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

async function esperarCiclos(veces = 3) {
  for (let i = 0; i < veces; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

const RUTA_PLATOS = '/api/platos?disponible=true';
const RUTA_HUESPED = '/api/huespedes?documento=1020304050';

function rutasBase(extra = {}) {
  return { [RUTA_PLATOS]: () => respuestaOk(PLATOS), ...extra };
}

async function buscarHuesped(contexto, documentoBuscado = '1020304050') {
  contexto.documento.getElementById('documento-huesped').value = documentoBuscado;
  enviarFormulario(contexto.dom, 'formulario-buscar-huesped');
  await esperarCiclos();
}

test('mesero.html tiene los contenedores que mesero.js necesita', () => {
  const doc = crearDom(RUTA_MESERO_HTML).window.document;

  ['formulario-buscar-huesped', 'documento-huesped', 'boton-buscar-huesped', 'error-huesped',
    'resultado-huesped', 'seccion-comanda', 'formulario-comanda', 'franja-comanda',
    'lista-platos', 'mensaje-platos', 'boton-registrar-comanda', 'error-comanda', 'exito-comanda',
  ].forEach((id) => {
    assert.notEqual(doc.getElementById(id), null, `falta #${id} en mesero.html`);
  });

  assert.equal(doc.getElementById('seccion-comanda').hidden, true);
  assert.equal(doc.getElementById('lista-platos').children.length, 0, 'la lista de platos la llena mesero.js');
});

test('al abrir el panel carga los platos disponibles con nombre y precio', async () => {
  const { documento, llamadas } = await montarPanelMesero({ rutas: rutasBase() });

  assert.equal(llamadas[0].ruta, RUTA_PLATOS);
  const filas = documento.querySelectorAll('.plato-fila');
  assert.equal(filas.length, 2);
  assert.equal(filas[0].querySelector('.plato-nombre').textContent, 'Caldo de costilla');
  assert.equal(filas[0].querySelector('.plato-precio').textContent, '$12.000');
  assert.equal(documento.getElementById('cantidad-plato-1').value, '0');
});

test('búsqueda exitosa muestra nombre y tipo del huésped y habilita la comanda', async () => {
  const contexto = await montarPanelMesero({
    rutas: rutasBase({ [RUTA_HUESPED]: () => respuestaOk(HUESPED) }),
  });

  await buscarHuesped(contexto);

  const resultado = contexto.documento.getElementById('resultado-huesped');
  assert.equal(resultado.hidden, false);
  assert.equal(resultado.querySelector('.huesped-nombre').textContent, 'Ana Torres');
  assert.match(resultado.querySelector('.huesped-tipo').textContent, /Ejecutivo/);
  assert.equal(contexto.documento.getElementById('seccion-comanda').hidden, false);
  assert.equal(contexto.documento.getElementById('error-huesped').hidden, true);
});

test('huésped no encontrado muestra el mensaje del backend tal cual, sin abrir la comanda', async () => {
  const contexto = await montarPanelMesero({
    rutas: rutasBase({
      [RUTA_HUESPED]: () => respuestaError(404, 'HUESPED_NO_ENCONTRADO', 'No existe un huésped con ese documento'),
    }),
  });

  await buscarHuesped(contexto);

  const banner = contexto.documento.getElementById('error-huesped');
  assert.equal(banner.hidden, false);
  assert.equal(banner.textContent, 'No existe un huésped con ese documento');
  assert.equal(contexto.documento.getElementById('seccion-comanda').hidden, true);
});

test('registrar comanda envía solo los platos con cantidad > 0 y muestra el pedido creado', async () => {
  const contexto = await montarPanelMesero({
    rutas: rutasBase({
      [RUTA_HUESPED]: () => respuestaOk(HUESPED),
      '/api/pedidos': () => respuestaOk({ id: 15, huespedId: 42, franja: 'almuerzo', estado: 'pendiente', items: [] }),
    }),
  });

  await buscarHuesped(contexto);
  contexto.documento.getElementById('franja-comanda').value = 'almuerzo';
  contexto.documento.getElementById('cantidad-plato-1').value = '0';
  contexto.documento.getElementById('cantidad-plato-2').value = '2';
  enviarFormulario(contexto.dom, 'formulario-comanda');
  await esperarCiclos();

  const llamadaPedido = contexto.llamadas.find((llamada) => llamada.ruta === '/api/pedidos');
  assert.notEqual(llamadaPedido, undefined, 'debe llamar a POST /api/pedidos');
  assert.equal(llamadaPedido.opciones.method, 'POST');
  const cuerpo = JSON.parse(llamadaPedido.opciones.body);
  assert.equal(cuerpo.huespedId, 42);
  assert.equal(cuerpo.franja, 'almuerzo');
  assert.equal(cuerpo.items.length, 1);
  assert.equal(cuerpo.items[0].platoId, 2);
  assert.equal(cuerpo.items[0].cantidad, 2);

  const exito = contexto.documento.getElementById('exito-comanda');
  assert.equal(exito.hidden, false);
  assert.match(exito.textContent, /Comanda registrada/);
  assert.match(exito.textContent, /#15/);
  assert.equal(contexto.documento.getElementById('cantidad-plato-2').value, '0', 'limpia cantidades para otra comanda');
  assert.equal(contexto.documento.getElementById('seccion-comanda').hidden, false, 'mantiene al huésped cargado');
});

test('DERECHO_COMIDAS_EXCEDIDO muestra el mensaje del backend tal cual y destacado', async () => {
  const mensajeBackend = 'El huésped ya consumió sus 2 comida(s) del día';
  const contexto = await montarPanelMesero({
    rutas: rutasBase({
      [RUTA_HUESPED]: () => respuestaOk(HUESPED),
      '/api/pedidos': () => respuestaError(409, 'DERECHO_COMIDAS_EXCEDIDO', mensajeBackend),
    }),
  });

  await buscarHuesped(contexto);
  contexto.documento.getElementById('cantidad-plato-1').value = '1';
  enviarFormulario(contexto.dom, 'formulario-comanda');
  await esperarCiclos();

  const banner = contexto.documento.getElementById('error-comanda');
  assert.equal(banner.hidden, false);
  assert.equal(banner.textContent, mensajeBackend);
  assert.equal(banner.classList.contains('banner-error--destacado'), true, 'debe verse distinto de un error genérico');
  assert.equal(contexto.documento.getElementById('exito-comanda').hidden, true);
  assert.equal(contexto.documento.getElementById('boton-registrar-comanda').disabled, false);
});

test('sin cantidades no llama al backend y avisa con una validación del cliente', async () => {
  const contexto = await montarPanelMesero({
    rutas: rutasBase({ [RUTA_HUESPED]: () => respuestaOk(HUESPED) }),
  });

  await buscarHuesped(contexto);
  const llamadasAntes = contexto.llamadas.length;
  enviarFormulario(contexto.dom, 'formulario-comanda');
  await esperarCiclos();

  assert.equal(contexto.llamadas.length, llamadasAntes, 'no debe llamar a POST /api/pedidos');
  assert.match(contexto.documento.getElementById('error-comanda').textContent, /al menos un plato/i);
});

test('el botón de registrar queda deshabilitado mientras la petición está en curso', async () => {
  let resolverPedido;
  const contexto = await montarPanelMesero({
    rutas: rutasBase({
      [RUTA_HUESPED]: () => respuestaOk(HUESPED),
      '/api/pedidos': () => new Promise((resolve) => { resolverPedido = resolve; }),
    }),
  });

  await buscarHuesped(contexto);
  contexto.documento.getElementById('cantidad-plato-1').value = '1';
  enviarFormulario(contexto.dom, 'formulario-comanda');
  await Promise.resolve();

  assert.equal(contexto.documento.getElementById('boton-registrar-comanda').disabled, true);
  resolverPedido(respuestaOk({ id: 3, items: [] }));
  await esperarCiclos();
  assert.equal(contexto.documento.getElementById('boton-registrar-comanda').disabled, false);
});

test('un error de red al buscar muestra el mensaje genérico propio', async () => {
  const contexto = await montarPanelMesero({
    rutas: rutasBase({ [RUTA_HUESPED]: () => { throw new Error('fallo de red'); } }),
  });

  await buscarHuesped(contexto);

  assert.match(contexto.documento.getElementById('error-huesped').textContent, /no se pudo conectar/i);
});
