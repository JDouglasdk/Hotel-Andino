// frontend/public/js/mesero.js
window.Comun = window.Comun || {};

(function inicializarMesero() {
  const ETIQUETAS_TIPO_HUESPED = {
    ordinario: 'Ordinario',
    ejecutivo: 'Ejecutivo',
    vip: 'VIP',
  };
  const MENSAJE_RED = 'No se pudo conectar. Intenta de nuevo.';
  const MENSAJE_INESPERADO = 'Ocurrió un error inesperado. Intenta de nuevo.';

  let huespedActual = null;
  let platosDisponibles = [];
  const entradasDeCantidad = new Map();

  function elemento(id) {
    return document.getElementById(id);
  }

  function mostrarBanner(id, mensaje, { destacado = false } = {}) {
    const banner = elemento(id);
    banner.textContent = mensaje;
    banner.classList.toggle('banner-error--destacado', destacado);
    banner.hidden = false;
  }

  function ocultarBanner(id) {
    const banner = elemento(id);
    banner.textContent = '';
    banner.classList.remove('banner-error--destacado');
    banner.hidden = true;
  }

  // SESION_EXPIRADA no produce mensaje: clienteApi ya redirigió al login.
  function textoDeError(error) {
    if (error && error.tipo === 'RED') return MENSAJE_RED;
    if (error && error.tipo === 'NEGOCIO') return error.mensaje || MENSAJE_INESPERADO;
    return null;
  }

  function esDerechoComidasExcedido(error) {
    return Boolean(error) && error.tipo === 'NEGOCIO' && error.codigo === 'DERECHO_COMIDAS_EXCEDIDO';
  }

  function formatearPrecio(precio) {
    return `$${String(precio).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  }

  function crearFilaDePlato(plato) {
    const fila = document.createElement('div');
    fila.className = 'plato-fila';

    const nombre = document.createElement('span');
    nombre.className = 'plato-nombre';
    nombre.textContent = plato.nombre;

    const precio = document.createElement('span');
    precio.className = 'plato-precio';
    precio.textContent = formatearPrecio(plato.precio);

    const etiqueta = document.createElement('label');
    etiqueta.className = 'plato-etiqueta-cantidad';
    etiqueta.htmlFor = `cantidad-plato-${plato.id}`;
    etiqueta.textContent = 'Cantidad';

    const entrada = document.createElement('input');
    entrada.type = 'number';
    entrada.id = `cantidad-plato-${plato.id}`;
    entrada.className = 'plato-cantidad';
    entrada.min = '0';
    entrada.step = '1';
    entrada.value = '0';

    fila.append(nombre, precio, etiqueta, entrada);
    entradasDeCantidad.set(plato.id, entrada);
    return fila;
  }

  function renderizarPlatos() {
    const lista = elemento('lista-platos');
    const mensaje = elemento('mensaje-platos');
    lista.replaceChildren();
    entradasDeCantidad.clear();

    if (!platosDisponibles.length) {
      mensaje.textContent = 'No hay platos disponibles en este momento.';
      mensaje.hidden = false;
      return;
    }

    mensaje.textContent = '';
    mensaje.hidden = true;
    platosDisponibles.forEach((plato) => {
      lista.append(crearFilaDePlato(plato));
    });
  }

  async function cargarPlatos() {
    const mensaje = elemento('mensaje-platos');
    mensaje.textContent = 'Cargando platos…';
    mensaje.hidden = false;

    let platos;
    try {
      platos = await window.Comun.clienteApi.peticion('/api/platos?disponible=true');
    } catch (error) {
      const texto = textoDeError(error);
      mensaje.textContent = texto || '';
      mensaje.hidden = !texto;
      return;
    }

    platosDisponibles = Array.isArray(platos) ? platos : [];
    renderizarPlatos();
  }

  function limpiarCantidades() {
    entradasDeCantidad.forEach((entrada) => {
      entrada.value = '0';
    });
  }

  function recolectarItems() {
    const items = [];
    entradasDeCantidad.forEach((entrada, platoId) => {
      const cantidad = Number.parseInt(entrada.value, 10);
      if (Number.isInteger(cantidad) && cantidad > 0) {
        items.push({ platoId, cantidad });
      }
    });
    return items;
  }

  function ocultarHuesped() {
    huespedActual = null;
    const contenedor = elemento('resultado-huesped');
    contenedor.replaceChildren();
    contenedor.hidden = true;
    elemento('seccion-comanda').hidden = true;
  }

  function mostrarHuesped(huesped) {
    huespedActual = huesped;

    const nombre = document.createElement('p');
    nombre.className = 'huesped-nombre';
    nombre.textContent = huesped.nombreCompleto;

    const documentoHuesped = document.createElement('p');
    documentoHuesped.className = 'huesped-documento';
    documentoHuesped.textContent = `Documento: ${huesped.documento}`;

    const tipo = document.createElement('p');
    tipo.className = 'huesped-tipo';
    tipo.textContent = `Tipo de huésped: ${ETIQUETAS_TIPO_HUESPED[huesped.tipoHuesped] || huesped.tipoHuesped}`;

    const contenedor = elemento('resultado-huesped');
    contenedor.replaceChildren(nombre, documentoHuesped, tipo);
    contenedor.hidden = false;

    limpiarCantidades();
    elemento('seccion-comanda').hidden = false;
  }

  async function manejarBusquedaDeHuesped(evento) {
    evento.preventDefault();
    ocultarBanner('error-huesped');
    ocultarBanner('error-comanda');
    ocultarBanner('exito-comanda');

    const documentoBuscado = elemento('documento-huesped').value.trim();
    if (!documentoBuscado) {
      mostrarBanner('error-huesped', 'Escribe el documento del huésped.');
      return;
    }

    const boton = elemento('boton-buscar-huesped');
    boton.disabled = true;
    try {
      const huesped = await window.Comun.clienteApi.peticion(
        `/api/huespedes?documento=${encodeURIComponent(documentoBuscado)}`,
      );
      mostrarHuesped(huesped);
    } catch (error) {
      ocultarHuesped();
      const texto = textoDeError(error);
      if (texto) mostrarBanner('error-huesped', texto);
    } finally {
      boton.disabled = false;
    }
  }

  async function manejarRegistroDeComanda(evento) {
    evento.preventDefault();
    ocultarBanner('error-comanda');
    ocultarBanner('exito-comanda');

    if (!huespedActual) {
      mostrarBanner('error-comanda', 'Primero busca al huésped por su documento.');
      return;
    }

    const items = recolectarItems();
    if (!items.length) {
      mostrarBanner('error-comanda', 'Agrega al menos un plato con cantidad mayor a cero.');
      return;
    }

    const boton = elemento('boton-registrar-comanda');
    boton.disabled = true;
    try {
      const pedido = await window.Comun.clienteApi.peticion('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          huespedId: huespedActual.id,
          franja: elemento('franja-comanda').value,
          items,
        }),
      });

      limpiarCantidades();
      const banner = elemento('exito-comanda');
      banner.textContent = `Comanda registrada — pedido #${pedido.id}`;
      banner.hidden = false;
    } catch (error) {
      const texto = textoDeError(error);
      if (texto) {
        mostrarBanner('error-comanda', texto, { destacado: esDerechoComidasExcedido(error) });
      }
    } finally {
      boton.disabled = false;
    }
  }

  function iniciarPanelMesero() {
    elemento('formulario-buscar-huesped').addEventListener('submit', manejarBusquedaDeHuesped);
    elemento('formulario-comanda').addEventListener('submit', manejarRegistroDeComanda);
    window.Comun._meseroPlatosListo = cargarPlatos();
  }

  window.Comun._panelListo = window.Comun.panel.inicializar({
    rolEsperado: 'mesero',
    alListo: iniciarPanelMesero,
  });
})();
