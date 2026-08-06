// frontend/public/js/cocina.js
window.Comun = window.Comun || {};

(function inicializarCocina() {
  const ETIQUETAS_FRANJA = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena' };
  const MENSAJE_RED = 'No se pudo conectar. Intenta de nuevo.';
  const MENSAJE_INESPERADO = 'Ocurrió un error inesperado. Intenta de nuevo.';

  // Las dos columnas del tablero. La clave es el estado que muestra cada una.
  const COLUMNAS = {
    pendiente: {
      idContenedor: 'cola-pendientes',
      textoVacio: 'No hay pedidos pendientes.',
      ruta: '/api/pedidos?estado=pendiente',
    },
    en_preparacion: {
      idContenedor: 'cola-en-preparacion',
      textoVacio: 'No hay pedidos en preparación.',
      ruta: '/api/pedidos?estado=en_preparacion',
    },
  };

  // Solo se ofrecen las transiciones que el backend permite al rol cocina.
  const ACCION_CANCELAR = {
    estado: 'cancelado',
    texto: 'Cancelar',
    clase: 'boton boton--peligro',
    confirmar: true,
  };
  const ACCIONES_POR_ESTADO = {
    pendiente: [
      { estado: 'en_preparacion', texto: 'Iniciar preparación', clase: 'boton boton--primario', confirmar: false },
      ACCION_CANCELAR,
    ],
    en_preparacion: [
      { estado: 'listo', texto: 'Marcar listo', clase: 'boton boton--primario', confirmar: false },
      ACCION_CANCELAR,
    ],
  };

  const nombresPorPlato = {};

  function elemento(id) {
    return document.getElementById(id);
  }

  function contenedorDe(estado) {
    return elemento(COLUMNAS[estado].idContenedor);
  }

  function vaciar(contenedor) {
    while (contenedor.firstChild) contenedor.removeChild(contenedor.firstChild);
  }

  // SESION_EXPIRADA no produce mensaje: clienteApi ya redirigió al login.
  // Los mensajes de negocio se muestran tal cual los devuelve el backend.
  function textoDeError(error) {
    if (error && error.tipo === 'SESION_EXPIRADA') return null;
    if (error && error.tipo === 'RED') return MENSAJE_RED;
    if (error && error.tipo === 'NEGOCIO') return error.mensaje || MENSAJE_INESPERADO;
    return MENSAJE_INESPERADO;
  }

  function mostrarError(error) {
    const texto = textoDeError(error);
    if (texto === null) return;
    const banner = elemento('error-cocina');
    banner.textContent = texto;
    banner.hidden = false;
  }

  function ocultarError() {
    const banner = elemento('error-cocina');
    banner.textContent = '';
    banner.hidden = true;
  }

  function nombreDePlato(platoId) {
    return nombresPorPlato[String(platoId)] || 'Plato #' + platoId;
  }

  function crearTextoVacio(texto) {
    const parrafo = document.createElement('p');
    parrafo.className = 'texto-vacio';
    parrafo.textContent = texto;
    return parrafo;
  }

  // Muestra u oculta el aviso de columna vacía según queden tarjetas o no.
  function actualizarVacio(estado) {
    const contenedor = contenedorDe(estado);
    const aviso = contenedor.querySelector('.texto-vacio');
    const hayTarjetas = contenedor.querySelector('.tarjeta-pedido') !== null;

    if (hayTarjetas) {
      if (aviso) aviso.remove();
      return;
    }
    if (!aviso) contenedor.append(crearTextoVacio(COLUMNAS[estado].textoVacio));
  }

  // Deshabilita todos los botones de la tarjeta, no solo el que se pulsó:
  // evita que un segundo clic (en este botón o en otro de la misma tarjeta)
  // dispare una acción sobre un pedido que ya está cambiando de estado.
  function deshabilitarBotonesDe(tarjeta, deshabilitado) {
    tarjeta.querySelectorAll('button').forEach((boton) => { boton.disabled = deshabilitado; });
  }

  function crearBotonAccion(accion, pedido, tarjeta) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = accion.clase;
    boton.dataset.accion = accion.estado;
    boton.textContent = accion.texto;

    boton.addEventListener('click', () => {
      if (!accion.confirmar) {
        deshabilitarBotonesDe(tarjeta, true);
        window.Comun._cocinaAccion = cambiarEstado(pedido, tarjeta, accion.estado);
        return;
      }
      // Se deshabilita ANTES de abrir el diálogo: un doble clic en "Cancelar"
      // no debe poder apilar dos diálogos de confirmación.
      deshabilitarBotonesDe(tarjeta, true);
      window.Comun.dialogo.abrir({
        titulo: 'Cancelar pedido',
        mensaje: '¿Cancelar este pedido? El pedido #' + pedido.id + ' no se podrá recuperar.',
        textoConfirmar: 'Sí, cancelar',
        alConfirmar: () => {
          window.Comun._cocinaAccion = cambiarEstado(pedido, tarjeta, accion.estado);
        },
        alCerrar: () => {
          deshabilitarBotonesDe(tarjeta, false);
        },
      });
    });

    return boton;
  }

  function crearTarjetaPedido(pedido) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'tarjeta-pedido';
    tarjeta.dataset.pedidoId = String(pedido.id);
    tarjeta.dataset.estado = pedido.estado;
    tarjeta.dataset.creadoEn = pedido.creadoEn || '';

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

    // No hay endpoint para resolver el nombre del huésped por id: el número basta
    // para cruzar la tarjeta contra la comanda física que trae el mesero.
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
    (ACCIONES_POR_ESTADO[pedido.estado] || []).forEach((accion) => {
      acciones.append(crearBotonAccion(accion, pedido, tarjeta));
    });

    tarjeta.append(cabecera, huesped, items, acciones);
    return tarjeta;
  }

  // La cola de cocina es FIFO: al mover una tarjeta la insertamos donde le toca
  // por antigüedad, para no tener que recargar ambas colas desde el servidor.
  function insertarEnOrden(contenedor, tarjeta) {
    const creadoEn = tarjeta.dataset.creadoEn;
    const id = Number(tarjeta.dataset.pedidoId);
    const posterior = Array.from(contenedor.querySelectorAll('.tarjeta-pedido')).find((otra) => {
      if (otra.dataset.creadoEn !== creadoEn) return otra.dataset.creadoEn > creadoEn;
      return Number(otra.dataset.pedidoId) > id;
    });
    contenedor.insertBefore(tarjeta, posterior || null);
  }

  function moverTarjeta(tarjeta, estadoAnterior, pedidoActualizado) {
    tarjeta.remove();
    actualizarVacio(estadoAnterior);

    // "listo" y "cancelado" salen del tablero de cocina: solo se re-pinta
    // la tarjeta si el nuevo estado tiene columna aquí.
    const destino = pedidoActualizado.estado;
    if (!COLUMNAS[destino]) return;
    insertarEnOrden(contenedorDe(destino), crearTarjetaPedido(pedidoActualizado));
    actualizarVacio(destino);
  }

  async function cambiarEstado(pedido, tarjeta, nuevoEstado) {
    ocultarError();
    // Ya deshabilitados por deshabilitarBotonesDe al hacer clic (o al abrir
    // el diálogo de confirmación) — aquí solo se rehabilitan si falla, porque
    // en éxito moverTarjeta reemplaza la tarjeta entera con botones nuevos.
    try {
      const actualizado = await window.Comun.clienteApi.peticion('/api/pedidos/' + pedido.id + '/estado', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      moverTarjeta(tarjeta, pedido.estado, actualizado || Object.assign({}, pedido, { estado: nuevoEstado }));
    } catch (error) {
      deshabilitarBotonesDe(tarjeta, false);
      mostrarError(error);
    }
  }

  function renderizarCola(estado, pedidos) {
    const contenedor = contenedorDe(estado);
    vaciar(contenedor);
    (Array.isArray(pedidos) ? pedidos : []).forEach((pedido) => {
      contenedor.append(crearTarjetaPedido(pedido));
    });
    actualizarVacio(estado);
  }

  // El catálogo de platos es cosmético: si falla, las tarjetas muestran "Plato #id".
  async function cargarNombresDePlatos() {
    try {
      const platos = await window.Comun.clienteApi.peticion('/api/platos');
      if (!Array.isArray(platos)) return;
      platos.forEach((plato) => { nombresPorPlato[String(plato.id)] = plato.nombre; });
    } catch (error) {
      // Sin nombres la cola igual se muestra: no se interrumpe el servicio.
    }
  }

  async function cargarColas() {
    const boton = elemento('boton-actualizar-pedidos');
    boton.disabled = true;
    ocultarError();
    try {
      // El filtro de estado solo acepta un valor: una llamada por columna.
      const [pendientes, enPreparacion] = await Promise.all([
        window.Comun.clienteApi.peticion(COLUMNAS.pendiente.ruta),
        window.Comun.clienteApi.peticion(COLUMNAS.en_preparacion.ruta),
      ]);
      renderizarCola('pendiente', pendientes);
      renderizarCola('en_preparacion', enPreparacion);
    } catch (error) {
      // Con una cola a medias es preferible no mostrar nada que mostrar datos viejos.
      vaciar(contenedorDe('pendiente'));
      vaciar(contenedorDe('en_preparacion'));
      mostrarError(error);
    } finally {
      boton.disabled = false;
    }
  }

  function iniciarPanelCocina() {
    elemento('boton-actualizar-pedidos').addEventListener('click', () => {
      window.Comun._cocinaCargando = cargarColas();
    });
    window.Comun._cocinaCargando = cargarNombresDePlatos().then(cargarColas);
  }

  window.Comun._panelListo = window.Comun.panel.inicializar({
    rolEsperado: 'cocina',
    alListo: iniciarPanelCocina,
  });
})();
