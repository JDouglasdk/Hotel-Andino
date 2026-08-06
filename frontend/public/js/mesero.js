// frontend/public/js/mesero.js
window.Comun = window.Comun || {};

(function inicializarMesero() {
  const ETIQUETAS_TIPO_HUESPED = {
    ordinario: 'Ordinario',
    ejecutivo: 'Ejecutivo',
    vip: 'VIP',
  };
  const ETIQUETAS_FRANJA = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena' };
  const MENSAJE_RED = 'No se pudo conectar. Intenta de nuevo.';
  const MENSAJE_INESPERADO = 'Ocurrió un error inesperado. Intenta de nuevo.';

  let huespedActual = null;
  let platosDisponibles = [];
  const entradasDeCantidad = new Map();
  // Independiente de platosDisponibles (que solo trae disponible:true): un
  // pedido listo puede referenciar un plato ya dado de baja mientras tanto.
  const nombresPorPlato = {};

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
  // Cualquier otro error no tipado (ej. una respuesta con forma inesperada)
  // cae en MENSAJE_INESPERADO — nunca se queda sin avisar nada al mesero.
  function textoDeError(error) {
    if (error && error.tipo === 'SESION_EXPIRADA') return null;
    if (error && error.tipo === 'RED') return MENSAJE_RED;
    if (error && error.tipo === 'NEGOCIO') return error.mensaje || MENSAJE_INESPERADO;
    return MENSAJE_INESPERADO;
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

  // --- Pedidos listos para entregar --------------------------------------
  // `listo -> entregado` es la única transición de esta máquina de estados
  // que le corresponde al rol mesero (cocina hace pendiente/en_preparacion).
  // Sin marcar "entregado" los reportes de caja del jefe de caja quedan en
  // cero: reportesServicio los calcula sobre pedidos entregados hoy.

  function nombreDePlato(platoId) {
    return nombresPorPlato[String(platoId)] || 'Plato #' + platoId;
  }

  function deshabilitarBotonesDe(tarjeta, deshabilitado) {
    tarjeta.querySelectorAll('button').forEach((boton) => { boton.disabled = deshabilitado; });
  }

  function crearTextoVacio(texto) {
    const parrafo = document.createElement('p');
    parrafo.className = 'texto-vacio';
    parrafo.textContent = texto;
    return parrafo;
  }

  function ocultarErrorListos() {
    ocultarBanner('error-listos');
  }

  function mostrarErrorListos(error) {
    const texto = textoDeError(error);
    if (texto === null) return;
    mostrarBanner('error-listos', texto);
  }

  async function marcarEntregado(pedido, tarjeta) {
    ocultarErrorListos();
    deshabilitarBotonesDe(tarjeta, true);
    try {
      await window.Comun.clienteApi.peticion('/api/pedidos/' + pedido.id + '/estado', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'entregado' }),
      });
      tarjeta.remove();
      if (!elemento('contenido-listos').querySelector('.tarjeta-pedido')) {
        elemento('contenido-listos').append(crearTextoVacio('No hay pedidos listos para entregar.'));
      }
    } catch (error) {
      deshabilitarBotonesDe(tarjeta, false);
      mostrarErrorListos(error);
    }
  }

  function crearTarjetaListo(pedido) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'tarjeta-pedido';
    tarjeta.dataset.pedidoId = String(pedido.id);

    const cabecera = document.createElement('div');
    cabecera.className = 'tarjeta-pedido-cabecera';

    const numero = document.createElement('h3');
    numero.className = 'tarjeta-pedido-numero';
    numero.textContent = 'Pedido #' + pedido.id;

    const franja = document.createElement('span');
    franja.className = 'insignia-franja';
    franja.dataset.franja = pedido.franja;
    franja.textContent = ETIQUETAS_FRANJA[pedido.franja] || pedido.franja;

    cabecera.append(numero, franja);

    const huesped = document.createElement('p');
    huesped.className = 'tarjeta-pedido-huesped';
    huesped.textContent = 'Huésped #' + pedido.huespedId;

    const items = document.createElement('ul');
    items.className = 'tarjeta-pedido-items';
    (pedido.items || []).forEach((item) => {
      const fila = document.createElement('li');
      fila.textContent = nombreDePlato(item.platoId) + ' x ' + item.cantidad;
      items.append(fila);
    });

    const acciones = document.createElement('div');
    acciones.className = 'tarjeta-pedido-acciones';
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton boton--primario';
    boton.textContent = 'Marcar entregado';
    boton.addEventListener('click', () => {
      window.Comun._meseroAccionListos = marcarEntregado(pedido, tarjeta);
    });
    acciones.append(boton);

    tarjeta.append(cabecera, huesped, items, acciones);
    return tarjeta;
  }

  function renderizarListos(pedidos) {
    const contenedor = elemento('contenido-listos');
    contenedor.replaceChildren();
    const lista = Array.isArray(pedidos) ? pedidos : [];
    if (!lista.length) {
      contenedor.append(crearTextoVacio('No hay pedidos listos para entregar.'));
      return;
    }
    lista.forEach((pedido) => contenedor.append(crearTarjetaListo(pedido)));
  }

  // El catálogo de platos es cosmético: si falla, las tarjetas muestran "Plato #id".
  async function cargarNombresDePlatos() {
    try {
      const platos = await window.Comun.clienteApi.peticion('/api/platos');
      if (!Array.isArray(platos)) return;
      platos.forEach((plato) => { nombresPorPlato[String(plato.id)] = plato.nombre; });
    } catch (error) {
      // Sin nombres la lista igual se muestra: no se interrumpe el servicio.
    }
  }

  async function cargarListos() {
    const boton = elemento('boton-actualizar-listos');
    boton.disabled = true;
    ocultarErrorListos();
    try {
      const pedidos = await window.Comun.clienteApi.peticion('/api/pedidos?estado=listo');
      renderizarListos(pedidos);
    } catch (error) {
      elemento('contenido-listos').replaceChildren();
      mostrarErrorListos(error);
    } finally {
      boton.disabled = false;
    }
  }

  function iniciarPanelMesero() {
    elemento('formulario-buscar-huesped').addEventListener('submit', manejarBusquedaDeHuesped);
    elemento('formulario-comanda').addEventListener('submit', manejarRegistroDeComanda);
    elemento('boton-actualizar-listos').addEventListener('click', () => {
      window.Comun._meseroListosCargando = cargarListos();
    });
    window.Comun._meseroPlatosListo = cargarPlatos();
    window.Comun._meseroListosCargando = cargarNombresDePlatos().then(cargarListos);
  }

  window.Comun._panelListo = window.Comun.panel.inicializar({
    rolEsperado: 'mesero',
    alListo: iniciarPanelMesero,
  });
})();
