window.Comun = window.Comun || {};

window.Comun.panel = {
  inicializar({ rolEsperado, documento = document }) {
    function mostrarError() {
      documento.getElementById('estado-carga').hidden = true;
      documento.getElementById('estado-error-sesion').hidden = false;
    }

    function mostrarContenido(usuario) {
      documento.getElementById('estado-carga').hidden = true;
      documento.getElementById('estado-error-sesion').hidden = true;
      window.Comun.header.construir({
        documento,
        contenedor: documento.getElementById('encabezado-contenedor'),
        usuario,
      });
      documento.getElementById('contenido-panel').hidden = false;
    }

    async function cargar() {
      documento.getElementById('estado-carga').hidden = false;
      documento.getElementById('estado-error-sesion').hidden = true;

      const resultado = await window.Comun.sesion.verificar({ rolEsperado });

      if (resultado === null) return;
      if (resultado && resultado.error === 'RED') {
        mostrarError();
        return;
      }
      mostrarContenido(resultado);
    }

    documento.getElementById('boton-reintentar-sesion').addEventListener('click', cargar);

    return cargar();
  },
};
