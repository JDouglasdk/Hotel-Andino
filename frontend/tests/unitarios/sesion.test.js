const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { crearDom, ejecutarScript } = require('../ayudas/dom');

const RUTA_PAGINA_VACIA = path.join(__dirname, '../ayudas/paginaVacia.html');
const RUTA_SESION = path.join(__dirname, '../../public/js/comun/sesion.js');

function crearDomConSesion() {
  const dom = crearDom(RUTA_PAGINA_VACIA);
  ejecutarScript(dom, RUTA_SESION);
  return dom;
}

test('sin sesión (401), redirige a /login y resuelve null', async () => {
  const dom = crearDomConSesion();
  dom.window.fetch = async () => ({ status: 401, ok: false, json: async () => ({}) });
  let redirigidoA = null;

  const resultado = await dom.window.Comun.sesion.verificar({ rolEsperado: 'admin', alRedirigir: (r) => { redirigidoA = r; } });

  assert.equal(resultado, null);
  assert.equal(redirigidoA, '/login');
});

test('con sesión pero rol distinto, redirige a SU propio panel (no a /login)', async () => {
  const dom = crearDomConSesion();
  dom.window.fetch = async () => ({ status: 200, ok: true, json: async () => ({ id: 1, nombreCompleto: 'Ana', rol: 'mesero' }) });
  let redirigidoA = null;

  const resultado = await dom.window.Comun.sesion.verificar({ rolEsperado: 'admin', alRedirigir: (r) => { redirigidoA = r; } });

  assert.equal(resultado, null);
  assert.equal(redirigidoA, '/mesero');
});

test('con sesión y rol correcto, resuelve el usuario sin redirigir', async () => {
  const dom = crearDomConSesion();
  dom.window.fetch = async () => ({ status: 200, ok: true, json: async () => ({ id: 1, nombreCompleto: 'Ana', rol: 'admin' }) });
  let redirigidoA = null;

  const resultado = await dom.window.Comun.sesion.verificar({ rolEsperado: 'admin', alRedirigir: (r) => { redirigidoA = r; } });

  assert.deepEqual(resultado, { id: 1, nombreCompleto: 'Ana', rol: 'admin' });
  assert.equal(redirigidoA, null);
});

test('un error de red no redirige — resuelve { error: "RED" }', async () => {
  const dom = crearDomConSesion();
  dom.window.fetch = async () => { throw new Error('fallo de red'); };
  let redirigidoA = null;

  const resultado = await dom.window.Comun.sesion.verificar({ rolEsperado: 'admin', alRedirigir: (r) => { redirigidoA = r; } });

  assert.equal(resultado.error, 'RED');
  assert.equal(redirigidoA, null);
});

test('una respuesta de servidor inesperada (500) tampoco redirige', async () => {
  const dom = crearDomConSesion();
  dom.window.fetch = async () => ({ status: 500, ok: false, json: async () => ({}) });
  let redirigidoA = null;

  const resultado = await dom.window.Comun.sesion.verificar({ rolEsperado: 'admin', alRedirigir: (r) => { redirigidoA = r; } });

  assert.equal(resultado.error, 'RED');
  assert.equal(redirigidoA, null);
});

test('un 200 con body malformado no redirige — resuelve { error: "RED" }', async () => {
  const dom = crearDomConSesion();
  dom.window.fetch = async () => ({ status: 200, ok: true, json: async () => { throw new SyntaxError('body invalido'); } });
  let redirigidoA = null;

  const resultado = await dom.window.Comun.sesion.verificar({ rolEsperado: 'admin', alRedirigir: (r) => { redirigidoA = r; } });

  assert.equal(resultado.error, 'RED');
  assert.equal(redirigidoA, null);
});
