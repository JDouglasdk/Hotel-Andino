window.Comun = window.Comun || {};

window.Comun.dialogo = {
  abrir({ documento = document, mensaje, titulo, soloCerrar = false, textoConfirmar = 'Sí, confirmar', alConfirmar, alCerrar }) {
    const overlay = documento.createElement('div');
    overlay.className = 'dialogo-overlay';

    const tarjeta = documento.createElement('div');
    tarjeta.className = 'dialogo-tarjeta';
    tarjeta.setAttribute('role', 'alertdialog');
    tarjeta.setAttribute('aria-modal', 'true');

    const botonCerrar = documento.createElement('button');
    botonCerrar.type = 'button';
    botonCerrar.className = 'dialogo-cerrar';
    botonCerrar.setAttribute('aria-label', 'Cerrar');
    botonCerrar.textContent = '×';

    function cerrar() {
      overlay.remove();
    }
    // Cerrar sin confirmar (× o Cancelar) es distinto de confirmar: quien
    // llamó puede necesitar deshacer un estado que preparó antes de abrir
    // el diálogo (ej. rehabilitar botones que deshabilitó preventivamente).
    function cerrarSinConfirmar() {
      cerrar();
      if (alCerrar) alCerrar();
    }
    botonCerrar.addEventListener('click', cerrarSinConfirmar);
    tarjeta.append(botonCerrar);

    if (titulo) {
      const textoTitulo = documento.createElement('p');
      textoTitulo.className = 'dialogo-titulo';
      textoTitulo.textContent = titulo;
      tarjeta.append(textoTitulo);
    }

    const textoMensaje = documento.createElement('p');
    textoMensaje.className = 'dialogo-mensaje';
    textoMensaje.textContent = mensaje;
    tarjeta.append(textoMensaje);

    if (!soloCerrar) {
      const acciones = documento.createElement('div');
      acciones.className = 'dialogo-acciones';

      const botonCancelar = documento.createElement('button');
      botonCancelar.type = 'button';
      botonCancelar.className = 'dialogo-cancelar';
      botonCancelar.textContent = 'Cancelar';
      botonCancelar.addEventListener('click', cerrarSinConfirmar);

      const botonConfirmar = documento.createElement('button');
      botonConfirmar.type = 'button';
      botonConfirmar.className = 'dialogo-confirmar';
      botonConfirmar.textContent = textoConfirmar;
      botonConfirmar.addEventListener('click', () => {
        cerrar();
        alConfirmar();
      });

      acciones.append(botonCancelar, botonConfirmar);
      tarjeta.append(acciones);
    }

    overlay.append(tarjeta);
    documento.body.append(overlay);

    return { cerrar };
  },
};
