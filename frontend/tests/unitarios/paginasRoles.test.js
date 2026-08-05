const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { crearDom } = require('../ayudas/dom');

const ROLES = ['admin', 'mesero', 'cocina', 'jefeDeCaja'];
const IDS_REQUERIDOS = ['encabezado-contenedor', 'estado-carga', 'estado-error-sesion', 'boton-reintentar-sesion', 'contenido-panel'];

ROLES.forEach((rol) => {
  test(`${rol}.html tiene los elementos que panel.js necesita`, () => {
    const dom = crearDom(path.join(__dirname, `../../public/${rol}.html`));
    IDS_REQUERIDOS.forEach((id) => {
      assert.notEqual(dom.window.document.getElementById(id), null, `falta #${id} en ${rol}.html`);
    });
    assert.equal(dom.window.document.getElementById('estado-error-sesion').hidden, true);
    assert.equal(dom.window.document.getElementById('contenido-panel').hidden, true);
  });

  test(`${rol}.js inicializa panel.js con rolEsperado: '${rol}'`, () => {
    const contenido = fs.readFileSync(path.join(__dirname, `../../public/js/${rol}.js`), 'utf8');
    assert.match(contenido, new RegExp(`rolEsperado:\\s*['"]${rol}['"]`));
  });
});
