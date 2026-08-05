// frontend/tests/unitarios/login.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { crearDom, ejecutarScript } = require('../ayudas/dom');

const RUTA_LOGIN_HTML = path.join(__dirname, '../../public/login.html');
const RUTA_DIALOGO = path.join(__dirname, '../../public/js/comun/dialogo.js');
const RUTA_LOGIN_JS = path.join(__dirname, '../../public/js/login.js');

test('login.html tiene los elementos esperados por login.js', () => {
  const dom = crearDom(RUTA_LOGIN_HTML);
  const doc = dom.window.document;

  assert.notEqual(doc.getElementById('cargando-login'), null);
  assert.notEqual(doc.getElementById('formulario-login'), null);
  assert.notEqual(doc.getElementById('error-login'), null);
  assert.equal(doc.getElementById('correo').type, 'email');
  assert.equal(doc.getElementById('contrasena').type, 'password');
  assert.equal(doc.getElementById('boton-ingresar').type, 'submit');
  assert.notEqual(doc.getElementById('boton-olvide-contrasena'), null);
  assert.equal(doc.getElementById('formulario-login').hidden, true);
});

function cargarPaginaLogin() {
  const dom = crearDom(RUTA_LOGIN_HTML);
  ejecutarScript(dom, RUTA_DIALOGO);
  return dom;
}

test('con sesión activa al cargar, redirige sin mostrar el formulario', async () => {
  const dom = cargarPaginaLogin();
  dom.window.fetch = async (ruta) => {
    if (ruta === '/api/auth/yo') return { status: 200, ok: true, json: async () => ({ rol: 'admin' }) };
    throw new Error(`ruta inesperada: ${ruta}`);
  };
  let redirigidoA = null;
  dom.window.Comun._loginRedirigir = (ruta) => { redirigidoA = ruta; };

  ejecutarScript(dom, RUTA_LOGIN_JS);
  await dom.window.Comun._loginListo;

  assert.equal(redirigidoA, '/admin');
  assert.equal(dom.window.document.getElementById('formulario-login').hidden, true);
});

test('sin sesión activa, muestra el formulario', async () => {
  const dom = cargarPaginaLogin();
  dom.window.fetch = async () => ({ status: 401, ok: false, json: async () => ({}) });

  ejecutarScript(dom, RUTA_LOGIN_JS);
  await dom.window.Comun._loginListo;

  assert.equal(dom.window.document.getElementById('formulario-login').hidden, false);
  assert.equal(dom.window.document.getElementById('cargando-login').hidden, true);
});

test('el envío deshabilita el botón mientras la petición está en curso', async () => {
  const dom = cargarPaginaLogin();
  let resolverLogin;
  dom.window.fetch = async (ruta) => {
    if (ruta === '/api/auth/yo') return { status: 401, ok: false, json: async () => ({}) };
    return new Promise((resolve) => { resolverLogin = resolve; });
  };

  ejecutarScript(dom, RUTA_LOGIN_JS);
  await dom.window.Comun._loginListo;

  dom.window.document.getElementById('correo').value = 'a@a.com';
  dom.window.document.getElementById('contrasena').value = 'x';
  dom.window.document.getElementById('formulario-login').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await Promise.resolve();

  assert.equal(dom.window.document.getElementById('boton-ingresar').disabled, true);
  resolverLogin({ status: 200, ok: true, json: async () => ({ rol: 'admin' }) });
});

test('error de credenciales se muestra tal cual lo devuelve el backend', async () => {
  const dom = cargarPaginaLogin();
  dom.window.fetch = async (ruta) => {
    if (ruta === '/api/auth/yo') return { status: 401, ok: false, json: async () => ({}) };
    return { status: 401, ok: false, json: async () => ({ error: { mensaje: 'Correo o contraseña incorrectos' } }) };
  };

  ejecutarScript(dom, RUTA_LOGIN_JS);
  await dom.window.Comun._loginListo;

  dom.window.document.getElementById('formulario-login').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const banner = dom.window.document.getElementById('error-login');
  assert.equal(banner.hidden, false);
  assert.equal(banner.textContent, 'Correo o contraseña incorrectos');
});

test('un 429 muestra el mensaje de rate limit, distinto de credenciales inválidas', async () => {
  const dom = cargarPaginaLogin();
  dom.window.fetch = async (ruta) => {
    if (ruta === '/api/auth/yo') return { status: 401, ok: false, json: async () => ({}) };
    return { status: 429, ok: false, json: async () => ({}) };
  };

  ejecutarScript(dom, RUTA_LOGIN_JS);
  await dom.window.Comun._loginListo;

  dom.window.document.getElementById('formulario-login').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const banner = dom.window.document.getElementById('error-login');
  assert.match(banner.textContent, /demasiados intentos/i);
});

test('un error de red muestra un mensaje genérico propio', async () => {
  const dom = cargarPaginaLogin();
  dom.window.fetch = async (ruta) => {
    if (ruta === '/api/auth/yo') return { status: 401, ok: false, json: async () => ({}) };
    throw new Error('fallo de red');
  };

  ejecutarScript(dom, RUTA_LOGIN_JS);
  await dom.window.Comun._loginListo;

  dom.window.document.getElementById('formulario-login').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const banner = dom.window.document.getElementById('error-login');
  assert.match(banner.textContent, /no se pudo conectar/i);
});

test('"olvidaste tu contraseña" abre el panel informativo, sin llamar a la API', async () => {
  const dom = cargarPaginaLogin();
  let llamadasFetch = 0;
  dom.window.fetch = async () => { llamadasFetch += 1; return { status: 401, ok: false, json: async () => ({}) }; };

  ejecutarScript(dom, RUTA_LOGIN_JS);
  await dom.window.Comun._loginListo;
  const llamadasAntes = llamadasFetch;

  dom.window.document.getElementById('boton-olvide-contrasena').dispatchEvent(new dom.window.Event('click', { bubbles: true }));

  const mensaje = dom.window.document.querySelector('.dialogo-mensaje');
  assert.match(mensaje.textContent, /solo el administrador/i);
  assert.equal(llamadasFetch, llamadasAntes, 'no debe disparar ninguna llamada a la API');
});
