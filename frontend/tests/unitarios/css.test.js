// frontend/tests/unitarios/css.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RUTA_BASE_CSS = path.join(__dirname, '../../public/css/base.css');
const RUTA_COMPONENTES_CSS = path.join(__dirname, '../../public/css/componentes.css');

test('base.css define las variables de color/espaciado compartidas', () => {
  const contenido = fs.readFileSync(RUTA_BASE_CSS, 'utf8');
  const variables = ['--color-fondo', '--color-texto', '--color-acento', '--color-error', '--color-exito', '--espacio-3'];
  variables.forEach((variable) => {
    assert.match(contenido, new RegExp(`${variable}\\s*:`), `falta la variable ${variable}`);
  });
});

test('componentes.css define los bloques de header, formulario, botón y diálogo', () => {
  const contenido = fs.readFileSync(RUTA_COMPONENTES_CSS, 'utf8');
  const selectores = ['.encabezado ', '.encabezado-rol--admin', '.formulario ', '.boton--primario', '.dialogo-overlay ', '.banner-error '];
  selectores.forEach((selector) => {
    assert.ok(contenido.includes(selector), `falta el selector ${selector.trim()}`);
  });
});
