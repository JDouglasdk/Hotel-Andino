window.Comun = window.Comun || {};

window.Comun.dialogo = {
  abrir({ documento = document, mensaje, titulo, soloCerrar = false, textoConfirmar = 'Sí, confirmar', alConfirmar }) {
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
    botonCerrar.addEventListener('click', cerrar);
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
      botonCancelar.addEventListener('click', cerrar);

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
