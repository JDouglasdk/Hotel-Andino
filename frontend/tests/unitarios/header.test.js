// frontend/tests/unitarios/header.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { crearDom, ejecutarScript } = require('../ayudas/dom');

const RUTA_PAGINA_VACIA = path.join(__dirname, '../ayudas/paginaVacia.html');
const RUTA_DIALOGO = path.join(__dirname, '../../public/js/comun/dialogo.js');
const RUTA_CLIENTE_API = path.join(__dirname, '../../public/js/comun/clienteApi.js');
const RUTA_HEADER = path.join(__dirname, '../../public/js/comun/header.js');

function crearDomConHeader() {
  const dom = crearDom(RUTA_PAGINA_VACIA);
  ejecutarScript(dom, RUTA_DIALOGO);
  ejecutarScript(dom, RUTA_CLIENTE_API);
  ejecutarScript(dom, RUTA_HEADER);
  const contenedor = dom.window.document.createElement('div');
  dom.window.document.body.append(contenedor);
  return { dom, contenedor };
}

test('renderiza la insignia de rol y el nombre según los datos recibidos', () => {
  const { dom, contenedor } = crearDomConHeader();

  dom.window.Comun.header.construir({ contenedor, usuario: { nombreCompleto: 'Ana Torres', rol: 'admin' } });

  assert.match(dom.window.document.querySelector('.encabezado-rol').textContent, /administrador/i);
  assert.equal(dom.window.document.querySelector('.encabezado-rol').classList.contains('encabezado-rol--admin'), true);
  assert.equal(dom.window.document.querySelector('.encabezado-nombre').textContent, 'Ana Torres');
});

test('el botón "Salir" abre dialogo.js y no cierra sesión antes de confirmar', () => {
  const { dom, contenedor } = crearDomConHeader();
  let seLlamoLogout = false;
  dom.window.fetch = async () => { seLlamoLogout = true; return { status: 200, ok: true, json: async () => ({}) }; };

  dom.window.Comun.header.construir({ contenedor, usuario: { nombreCompleto: 'Ana Torres', rol: 'admin' } });
  dom.window.document.querySelector('.encabezado-salir').dispatchEvent(new dom.window.Event('click', { bubbles: true }));

  assert.notEqual(dom.window.document.querySelector('.dialogo-overlay'), null);
  assert.equal(seLlamoLogout, false, 'no debe cerrar sesión antes de confirmar');
  assert.match(dom.window.document.querySelector('.dialogo-mensaje').textContent, /cerrar sesión/i);
});

test('confirmar en el diálogo de "Salir" llama a POST /api/auth/logout', async () => {
  const { dom, contenedor } = crearDomConHeader();
  let rutaLlamada = null;
  let metodoLlamado = null;
  dom.window.fetch = async (ruta, opciones) => {
    rutaLlamada = ruta;
    metodoLlamado = opciones && opciones.method;
    return { status: 200, ok: true, json: async () => ({}) };
  };

  dom.window.Comun.header.construir({ contenedor, usuario: { nombreCompleto: 'Ana Torres', rol: 'admin' } });
  dom.window.document.querySelector('.encabezado-salir').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  dom.window.document.querySelector('.dialogo-confirmar').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(rutaLlamada, '/api/auth/logout');
  assert.equal(metodoLlamado, 'POST');
});
