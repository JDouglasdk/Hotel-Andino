window.Comun = window.Comun || {};

window.Comun.panel = {
  inicializar({ rolEsperado, documento = document, alListo }) {
    let yaInicializoContenido = false;

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
      // El "Reintentar" puede volver a llamar a cargar() tras un éxito
      // previo (p.ej. si el usuario lo pulsa de más) — alListo solo debe
      // correr una vez, para no duplicar la UI de negocio del panel.
      if (alListo && !yaInicializoContenido) {
        yaInicializoContenido = true;
        alListo(usuario);
      }
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
