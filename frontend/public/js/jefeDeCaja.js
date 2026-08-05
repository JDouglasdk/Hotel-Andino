// frontend/public/js/jefeDeCaja.js
window.Comun = window.Comun || {};

(function inicializarJefeDeCaja() {
  const FRANJAS = ['desayuno', 'almuerzo', 'cena'];
  const ETIQUETAS_FRANJA = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena' };

  function mensajeDeError(error) {
    // Los mensajes de negocio se muestran tal cual los devuelve el backend.
    if (error && error.tipo === 'NEGOCIO' && error.mensaje) return error.mensaje;
    if (error && error.tipo === 'RED') return 'No se pudo conectar. Intenta de nuevo.';
    return 'No se pudo cargar la información. Intenta de nuevo.';
  }

  function vaciar(elemento) {
    while (elemento.firstChild) elemento.removeChild(elemento.firstChild);
  }

  function mostrarErrorSeccion(idBanner, error) {
    const banner = document.getElementById(idBanner);
    banner.textContent = mensajeDeError(error);
    banner.hidden = false;
  }

  function ocultarErrorSeccion(idBanner) {
    const banner = document.getElementById(idBanner);
    banner.textContent = '';
    banner.hidden = true;
  }

  function formatearPesos(valor) {
    const numero = Number(valor);
    const monto = Number.isFinite(numero) ? numero : 0;
    return '$' + monto.toLocaleString('es-CO');
  }

  // Redondea a 2 decimales — evita artefactos de punto flotante como
  // "27.9000000000000002" al restar cantidades sucesivas en el backend.
  function formatearCantidad(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return String(valor);
    return numero.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  function crearTextoVacio(texto) {
    const parrafo = document.createElement('p');
    parrafo.className = 'texto-vacio';
    parrafo.textContent = texto;
    return parrafo;
  }

  function crearTarjetaResumen(etiqueta, valor, destacada) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-resumen';

    const rotulo = document.createElement('p');
    rotulo.className = 'tarjeta-resumen-etiqueta';
    rotulo.textContent = etiqueta;

    const dato = document.createElement('p');
    dato.className = destacada ? 'tarjeta-resumen-valor tarjeta-resumen-valor--destacado' : 'tarjeta-resumen-valor';
    dato.textContent = valor;

    tarjeta.append(rotulo, dato);
    return tarjeta;
  }

  function crearTabla(encabezados, filas) {
    const tabla = document.createElement('table');
    tabla.className = 'tabla';

    const cabecera = document.createElement('thead');
    const filaCabecera = document.createElement('tr');
    encabezados.forEach((texto) => {
      const celda = document.createElement('th');
      celda.setAttribute('scope', 'col');
      celda.textContent = texto;
      filaCabecera.append(celda);
    });
    cabecera.append(filaCabecera);

    const cuerpo = document.createElement('tbody');
    filas.forEach((celdas) => {
      const fila = document.createElement('tr');
      celdas.forEach((texto) => {
        const celda = document.createElement('td');
        celda.textContent = texto;
        fila.append(celda);
      });
      cuerpo.append(fila);
    });

    tabla.append(cabecera, cuerpo);
    return tabla;
  }

  function renderizarCajaDelDia(reporte) {
    const contenedor = document.getElementById('resumen-caja-del-dia');
    vaciar(contenedor);
    contenedor.append(
      crearTarjetaResumen('Total recaudado hoy', formatearPesos(reporte && reporte.total), true),
      crearTarjetaResumen('Pedidos entregados', String((reporte && reporte.cantidadPedidos) || 0), false),
    );
  }

  function ordenarFranjas(reporte) {
    const conocidas = FRANJAS.filter((franja) => reporte[franja]);
    const otras = Object.keys(reporte).filter((franja) => !FRANJAS.includes(franja));
    return conocidas.concat(otras).filter((franja) => Object.keys(reporte[franja] || {}).length > 0);
  }

  function renderizarPlatosPorFranja(reporte, nombresPorPlato) {
    const contenedor = document.getElementById('contenido-platos-por-franja');
    vaciar(contenedor);

    const franjas = ordenarFranjas(reporte);
    if (franjas.length === 0) {
      contenedor.append(crearTextoVacio('Todavía no hay platos servidos hoy.'));
      return;
    }

    franjas.forEach((franja) => {
      const bloque = document.createElement('section');
      bloque.className = 'bloque-franja';
      bloque.dataset.franja = franja;

      const titulo = document.createElement('h3');
      titulo.textContent = ETIQUETAS_FRANJA[franja] || franja;

      const platos = reporte[franja];
      const filas = Object.keys(platos).map((platoId) => [
        nombresPorPlato[String(platoId)] || 'Plato #' + platoId,
        String(platos[platoId]),
      ]);

      bloque.append(titulo, crearTabla(['Plato', 'Cantidad servida'], filas));
      contenedor.append(bloque);
    });
  }

  function renderizarInventario(ingredientes) {
    const contenedor = document.getElementById('contenido-inventario');
    vaciar(contenedor);

    if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
      contenedor.append(crearTextoVacio('No hay ingredientes registrados.'));
      return;
    }

    const filas = ingredientes.map((ingrediente) => [
      ingrediente.nombre,
      formatearCantidad(ingrediente.cantidadStock),
      ingrediente.unidadMedida,
    ]);
    contenedor.append(crearTabla(['Ingrediente', 'Cantidad en stock', 'Unidad de medida'], filas));
  }

  function manejarFalloSeccion(idBanner, idContenido, error) {
    vaciar(document.getElementById(idContenido));
    // Con la sesión expirada clienteApi ya redirige: no tiene sentido pintar un error.
    if (error && error.tipo === 'SESION_EXPIRADA') return;
    mostrarErrorSeccion(idBanner, error);
  }

  async function cargarCajaDelDia() {
    ocultarErrorSeccion('error-caja-del-dia');
    try {
      renderizarCajaDelDia(await window.Comun.clienteApi.peticion('/api/reportes/caja-del-dia'));
    } catch (error) {
      manejarFalloSeccion('error-caja-del-dia', 'resumen-caja-del-dia', error);
    }
  }

  async function cargarPlatosPorFranja() {
    ocultarErrorSeccion('error-platos-por-franja');

    const [reporte, platos] = await Promise.allSettled([
      window.Comun.clienteApi.peticion('/api/reportes/platos-por-franja'),
      window.Comun.clienteApi.peticion('/api/platos'),
    ]);

    if (reporte.status === 'rejected') {
      manejarFalloSeccion('error-platos-por-franja', 'contenido-platos-por-franja', reporte.reason);
      return;
    }

    // Si el catálogo de platos falla, igual mostramos el reporte usando el id como respaldo.
    const nombresPorPlato = {};
    if (platos.status === 'fulfilled' && Array.isArray(platos.value)) {
      platos.value.forEach((plato) => { nombresPorPlato[String(plato.id)] = plato.nombre; });
    }

    renderizarPlatosPorFranja(reporte.value || {}, nombresPorPlato);
  }

  async function cargarInventario() {
    ocultarErrorSeccion('error-inventario');
    try {
      renderizarInventario(await window.Comun.clienteApi.peticion('/api/ingredientes'));
    } catch (error) {
      manejarFalloSeccion('error-inventario', 'contenido-inventario', error);
    }
  }

  function cargarTodo() {
    const boton = document.getElementById('boton-actualizar-reportes');
    boton.disabled = true;
    // Cada sección atrapa su propio error: un fallo no tumba a las demás.
    return Promise.all([cargarCajaDelDia(), cargarPlatosPorFranja(), cargarInventario()])
      .finally(() => { boton.disabled = false; });
  }

  function iniciarPanelJefeDeCaja() {
    document.getElementById('boton-actualizar-reportes').addEventListener('click', () => {
      window.Comun._jefeDeCajaCargando = cargarTodo();
    });
    window.Comun._jefeDeCajaCargando = cargarTodo();
  }

  window.Comun._panelListo = window.Comun.panel.inicializar({
    rolEsperado: 'jefeDeCaja',
    alListo: iniciarPanelJefeDeCaja,
  });
})();
