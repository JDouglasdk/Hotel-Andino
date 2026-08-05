const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { crearDom, ejecutarScript } = require('../ayudas/dom');

const RUTA_PAGINA_VACIA = path.join(__dirname, '../ayudas/paginaVacia.html');
const RUTA_DIALOGO = path.join(__dirname, '../../public/js/comun/dialogo.js');

function crearDomConDialogo() {
  const dom = crearDom(RUTA_PAGINA_VACIA);
  ejecutarScript(dom, RUTA_DIALOGO);
  return dom;
}

test('abre con el mensaje (y título opcional) recibidos por parámetro', () => {
  const dom = crearDomConDialogo();

  dom.window.Comun.dialogo.abrir({ documento: dom.window.document, titulo: 'Un título', mensaje: 'Un mensaje', alConfirmar: () => {} });

  assert.equal(dom.window.document.querySelector('.dialogo-titulo').textContent, 'Un título');
  assert.equal(dom.window.document.querySelector('.dialogo-mensaje').textContent, 'Un mensaje');
});

test('confirmar ejecuta la acción y cierra el diálogo', () => {
  const dom = crearDomConDialogo();
  let ejecutado = false;

  dom.window.Comun.dialogo.abrir({ documento: dom.window.document, mensaje: 'x', alConfirmar: () => { ejecutado = true; } });
  dom.window.document.querySelector('.dialogo-confirmar').dispatchEvent(new dom.window.Event('click', { bubbles: true }));

  assert.equal(ejecutado, true);
  assert.equal(dom.window.document.querySelector('.dialogo-overlay'), null);
});

test('cancelar cierra sin ejecutar la acción', () => {
  const dom = crearDomConDialogo();
  let ejecutado = false;

  dom.window.Comun.dialogo.abrir({ documento: dom.window.document, mensaje: 'x', alConfirmar: () => { ejecutado = true; } });
  dom.window.document.querySelector('.dialogo-cancelar').dispatchEvent(new dom.window.Event('click', { bubbles: true }));

  assert.equal(ejecutado, false);
  assert.equal(dom.window.document.querySelector('.dialogo-overlay'), null);
});

test('cerrar (X) cierra sin ejecutar la acción', () => {
  const dom = crearDomConDialogo();
  let ejecutado = false;

  dom.window.Comun.dialogo.abrir({ documento: dom.window.document, mensaje: 'x', alConfirmar: () => { ejecutado = true; } });
  dom.window.document.querySelector('.dialogo-cerrar').dispatchEvent(new dom.window.Event('click', { bubbles: true }));

  assert.equal(ejecutado, false);
  assert.equal(dom.window.document.querySelector('.dialogo-overlay'), null);
});

test('soloCerrar:true no muestra acciones de confirmar/cancelar', () => {
  const dom = crearDomConDialogo();

  dom.window.Comun.dialogo.abrir({ documento: dom.window.document, mensaje: 'x', soloCerrar: true });

  assert.equal(dom.window.document.querySelector('.dialogo-acciones'), null);
  assert.notEqual(dom.window.document.querySelector('.dialogo-cerrar'), null);
});

test('el texto del botón confirmar es personalizable', () => {
  const dom = crearDomConDialogo();

  dom.window.Comun.dialogo.abrir({ documento: dom.window.document, mensaje: 'x', textoConfirmar: 'Entendido', alConfirmar: () => {} });

  assert.equal(dom.window.document.querySelector('.dialogo-confirmar').textContent, 'Entendido');
});
