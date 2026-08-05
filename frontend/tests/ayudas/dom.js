const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function crearDom(rutaHtml, { url = 'http://localhost/' } = {}) {
  const html = fs.readFileSync(rutaHtml, 'utf8');
  return new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
}

function ejecutarScript(dom, rutaJs) {
  const codigo = fs.readFileSync(rutaJs, 'utf8');
  dom.window.eval(codigo);
}

module.exports = { crearDom, ejecutarScript };
