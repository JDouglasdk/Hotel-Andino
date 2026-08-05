// frontend/tests/unitarios/clienteApi.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { crearDom, ejecutarScript } = require('../ayudas/dom');

const RUTA_PAGINA_VACIA = path.join(__dirname, '../ayudas/paginaVacia.html');
const RUTA_DIALOGO = path.join(__dirname, '../../public/js/comun/dialogo.js');
const RUTA_CLIENTE_API = path.join(__dirname, '../../public/js/comun/clienteApi.js');

function crearDomConClienteApi() {
  const dom = crearDom(RUTA_PAGINA_VACIA);
  ejecutarScript(dom, RUTA_DIALOGO);
  ejecutarScript(dom, RUTA_CLIENTE_API);
  return dom;
}

test('toda llamada incluye credentials: include', async () => {
  const dom = crearDomConClienteApi();
  let opcionesRecibidas;
  dom.window.fetch = async (ruta, opciones) => {
    opcionesRecibidas = opciones;
    return { status: 200, ok: true, json: async () => ({}) };
  };

  await dom.window.Comun.clienteApi.peticion('/api/ingredientes');

  assert.equal(opcionesRecibidas.credentials, 'include');
});

test('una respuesta exitosa resuelve con el cuerpo JSON', async () => {
  const dom = crearDomConClienteApi();
  dom.window.fetch = async () => ({ status: 200, ok: true, json: async () => ({ id: 1 }) });

  const resultado = await dom.window.Comun.clienteApi.peticion('/api/ingredientes');

  assert.deepEqual(resultado, { id: 1 });
});

test('un 401 rechaza SESION_EXPIRADA e inmediatamente redirige (sin dialog dismissible)', async () => {
  const dom = crearDomConClienteApi();
  dom.window.fetch = async () => ({ status: 401, ok: false, json: async () => ({}) });

  let redirigidoA = null;
  await assert.rejects(
    () => dom.window.Comun.clienteApi.peticion('/api/ingredientes', {}, { alRedirigir: (ruta) => { redirigidoA = ruta; } }),
    (error) => { assert.equal(error.tipo, 'SESION_EXPIRADA'); return true; }
  );

  assert.equal(redirigidoA, '/login', 'debe redirigir inmediatamente sin permitir dismissal');
});

test('una respuesta de error de negocio rechaza con status/codigo/mensaje del backend', async () => {
  const dom = crearDomConClienteApi();
  dom.window.fetch = async () => ({
    status: 404,
    ok: false,
    json: async () => ({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'El huésped 9 no existe' } }),
  });

  await assert.rejects(
    () => dom.window.Comun.clienteApi.peticion('/api/huespedes/9'),
    (error) => {
      assert.equal(error.tipo, 'NEGOCIO');
      assert.equal(error.status, 404);
      assert.equal(error.codigo, 'NO_ENCONTRADO');
      assert.equal(error.mensaje, 'El huésped 9 no existe');
      return true;
    }
  );
});

test('un error de red (fetch rechaza) se distingue de un error de negocio', async () => {
  const dom = crearDomConClienteApi();
  dom.window.fetch = async () => { throw new Error('fallo de red'); };

  await assert.rejects(
    () => dom.window.Comun.clienteApi.peticion('/api/ingredientes'),
    (error) => { assert.equal(error.tipo, 'RED'); return true; }
  );
});

test('un JSON malformado en respuesta 2xx rechaza con tipo NEGOCIO (no SyntaxError)', async () => {
  const dom = crearDomConClienteApi();
  dom.window.fetch = async () => ({
    status: 200,
    ok: true,
    json: async () => { throw new SyntaxError('JSON.parse error'); },
  });

  await assert.rejects(
    () => dom.window.Comun.clienteApi.peticion('/api/ingredientes'),
    (error) => {
      assert.equal(error.tipo, 'NEGOCIO');
      assert.equal(error.status, 200);
      assert.equal(error.codigo, undefined);
      assert.equal(error.mensaje, undefined);
      return true;
    }
  );
});
