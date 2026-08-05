const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { crearDom, ejecutarScript } = require('../ayudas/dom');

const RUTA_PAGINA_PANEL = path.join(__dirname, '../ayudas/paginaPanel.html');
const RUTA_PANEL = path.join(__dirname, '../../public/js/comun/panel.js');

function crearDomConPanelStubs({ resultadoVerificar, comportamientoVerificar }) {
  const dom = crearDom(RUTA_PAGINA_PANEL);
  const llamadasHeader = [];
  let llamadasVerificar = 0;

  dom.window.Comun = {
    sesion: {
      verificar: async () => {
        llamadasVerificar += 1;
        if (comportamientoVerificar) return comportamientoVerificar(llamadasVerificar);
        return resultadoVerificar;
      },
    },
    header: {
      construir: (args) => { llamadasHeader.push(args); },
    },
  };

  ejecutarScript(dom, RUTA_PANEL);
  return { dom, llamadasHeader, contarVerificar: () => llamadasVerificar };
}

test('con sesión válida: oculta carga, muestra contenido y monta el header con el usuario', async () => {
  const usuario = { nombreCompleto: 'Ana', rol: 'admin' };
  const { dom, llamadasHeader } = crearDomConPanelStubs({ resultadoVerificar: usuario });

  await dom.window.Comun.panel.inicializar({ rolEsperado: 'admin' });

  assert.equal(dom.window.document.getElementById('estado-carga').hidden, true);
  assert.equal(dom.window.document.getElementById('estado-error-sesion').hidden, true);
  assert.equal(dom.window.document.getElementById('contenido-panel').hidden, false);
  assert.equal(llamadasHeader.length, 1);
  assert.deepEqual(llamadasHeader[0].usuario, usuario);
});

test('si sesion.verificar ya redirigió (null), no monta header ni muestra contenido', async () => {
  const { dom, llamadasHeader } = crearDomConPanelStubs({ resultadoVerificar: null });

  await dom.window.Comun.panel.inicializar({ rolEsperado: 'admin' });

  assert.equal(llamadasHeader.length, 0);
  assert.equal(dom.window.document.getElementById('contenido-panel').hidden, true);
});

test('si sesion.verificar devuelve error de red, muestra el estado de error (no el contenido)', async () => {
  const { dom, llamadasHeader } = crearDomConPanelStubs({ resultadoVerificar: { error: 'RED' } });

  await dom.window.Comun.panel.inicializar({ rolEsperado: 'admin' });

  assert.equal(dom.window.document.getElementById('estado-error-sesion').hidden, false);
  assert.equal(dom.window.document.getElementById('contenido-panel').hidden, true);
  assert.equal(llamadasHeader.length, 0);
});

test('el botón "Reintentar" vuelve a llamar a sesion.verificar y puede recuperarse', async () => {
  const usuario = { nombreCompleto: 'Ana', rol: 'admin' };
  const { dom, contarVerificar } = crearDomConPanelStubs({
    comportamientoVerificar: (intento) => (intento === 1 ? { error: 'RED' } : usuario),
  });

  await dom.window.Comun.panel.inicializar({ rolEsperado: 'admin' });
  assert.equal(dom.window.document.getElementById('estado-error-sesion').hidden, false);

  dom.window.document.getElementById('boton-reintentar-sesion').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(contarVerificar(), 2);
  assert.equal(dom.window.document.getElementById('contenido-panel').hidden, false);
});
