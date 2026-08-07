// frontend/public/js/admin.js
window.Comun = window.Comun || {};

(function inicializarAdmin() {
  const MENSAJE_RED = 'No se pudo conectar. Intenta de nuevo.';
  const MENSAJE_INESPERADO = 'Ocurrió un error inesperado. Intenta de nuevo.';

  const ETIQUETAS_ROL = {
    admin: 'Administrador',
    mesero: 'Mesero',
    cocina: 'Cocina',
    jefeDeCaja: 'Jefe de caja',
  };

  const ETIQUETAS_MOTIVO_MOVIMIENTO = {
    compra: 'Compra',
    merma: 'Merma',
    ajuste: 'Ajuste',
    consumo_comanda: 'Consumo (pedido)',
    restitucion_cancelacion: 'Restitución (cancelación)',
  };

  // El usuario con la sesión abierta: se usa para no ofrecerle acciones que
  // lo dejarían fuera del sistema (desactivar su propia cuenta).
  let usuarioActual = null;

  // Copia local de cada listado: permite repintar una fila tras un PATCH
  // sin volver a pedir toda la sección al servidor.
  let usuarios = [];
  let categorias = [];
  let platos = [];
  let ingredientes = [];

  function elemento(id) {
    return document.getElementById(id);
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

  function mostrarBanner(id, texto) {
    const banner = elemento(id);
    banner.textContent = texto;
    banner.hidden = false;
  }

  function ocultarBanner(id) {
    const banner = elemento(id);
    banner.textContent = '';
    banner.hidden = true;
  }

  function mostrarError(id, error) {
    const texto = textoDeError(error);
    if (texto === null) return;
    mostrarBanner(id, texto);
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

  function crearCelda(contenido) {
    const celda = document.createElement('td');
    if (contenido && contenido.nodeType === 1) celda.append(contenido);
    else celda.textContent = String(contenido);
    return celda;
  }

  // `filas` es un arreglo de arreglos: cada celda es texto o un elemento ya
  // creado (un botón, un input). `prepararFila` marca la fila con su id.
  function crearTabla(encabezados, filas, prepararFila) {
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
    filas.forEach((celdas, indice) => {
      const fila = document.createElement('tr');
      celdas.forEach((contenido) => fila.append(crearCelda(contenido)));
      if (prepararFila) prepararFila(fila, indice);
      cuerpo.append(fila);
    });

    tabla.append(cabecera, cuerpo);
    return tabla;
  }

  function crearBoton(texto, clase, alHacerClic) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = clase;
    boton.textContent = texto;
    boton.addEventListener('click', alHacerClic);
    return boton;
  }

  function reemplazarPorId(lista, id, registro) {
    const indice = lista.findIndex((item) => item.id === id);
    if (indice !== -1) lista[indice] = registro;
  }

  function enviarJson(ruta, metodo, cuerpo) {
    return window.Comun.clienteApi.peticion(ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  }

  // Deja la sección vacía y muestra el error del backend tal cual.
  function manejarFalloDeCarga(idBanner, idContenido, error) {
    vaciar(elemento(idContenido));
    mostrarError(idBanner, error);
  }

  // --- Usuarios ---------------------------------------------------------

  function esUsuarioActual(usuario) {
    return Boolean(usuarioActual) && usuario.id === usuarioActual.id;
  }

  function crearBotonEstadoUsuario(usuario) {
    // El admin que tiene la sesión abierta no puede desactivarse a sí mismo:
    // el backend revalida `activo` en cada petición y le rechazaría el login,
    // así que quedaría fuera del sistema sin forma de reactivarse desde la app.
    if (esUsuarioActual(usuario)) {
      const propia = document.createElement('span');
      propia.className = 'texto-cuenta-propia';
      propia.textContent = 'Tu cuenta';
      return propia;
    }

    const activar = !usuario.activo;
    const boton = crearBoton(
      activar ? 'Activar' : 'Desactivar',
      activar ? 'boton boton--secundario' : 'boton boton--peligro',
      () => {
        if (activar) {
          window.Comun._adminAccion = cambiarEstadoUsuario(usuario, true, boton);
          return;
        }
        // Desactivar deja a alguien fuera del sistema en pleno servicio:
        // nunca debe salir de un clic accidental.
        window.Comun.dialogo.abrir({
          titulo: 'Desactivar usuario',
          mensaje: '¿Desactivar a ' + usuario.nombreCompleto + '? No podrá iniciar sesión hasta que lo actives de nuevo.',
          textoConfirmar: 'Sí, desactivar',
          alConfirmar: () => {
            window.Comun._adminAccion = cambiarEstadoUsuario(usuario, false, boton);
          },
        });
      },
    );
    boton.dataset.accion = activar ? 'activar' : 'desactivar';
    return boton;
  }

  function renderizarUsuarios() {
    const contenedor = elemento('contenido-usuarios');
    vaciar(contenedor);

    if (usuarios.length === 0) {
      contenedor.append(crearTextoVacio('No hay usuarios registrados.'));
      return;
    }

    const filas = usuarios.map((usuario) => [
      usuario.nombreCompleto,
      usuario.correo,
      ETIQUETAS_ROL[usuario.rol] || usuario.rol,
      usuario.activo ? 'Activo' : 'Inactivo',
      crearBotonEstadoUsuario(usuario),
    ]);

    contenedor.append(crearTabla(
      ['Nombre', 'Correo', 'Rol', 'Estado', 'Acción'],
      filas,
      (fila, indice) => { fila.dataset.usuarioId = String(usuarios[indice].id); },
    ));
  }

  async function cambiarEstadoUsuario(usuario, activo, boton) {
    ocultarBanner('error-usuarios');
    ocultarBanner('exito-usuarios');
    boton.disabled = true;
    try {
      const actualizado = await enviarJson('/api/usuarios/' + usuario.id + '/estado', 'PATCH', { activo });
      reemplazarPorId(usuarios, usuario.id, actualizado || Object.assign({}, usuario, { activo }));
      renderizarUsuarios();
    } catch (error) {
      boton.disabled = false;
      mostrarError('error-usuarios', error);
    }
  }

  async function cargarUsuarios() {
    ocultarBanner('error-usuarios');
    try {
      const respuesta = await window.Comun.clienteApi.peticion('/api/usuarios');
      usuarios = Array.isArray(respuesta) ? respuesta : [];
      renderizarUsuarios();
    } catch (error) {
      usuarios = [];
      manejarFalloDeCarga('error-usuarios', 'contenido-usuarios', error);
    }
  }

  async function manejarCrearUsuario(evento) {
    evento.preventDefault();
    ocultarBanner('error-usuarios');
    ocultarBanner('exito-usuarios');

    const nombreCompleto = elemento('nombre-usuario').value.trim();
    const correo = elemento('correo-usuario').value.trim();
    const contrasena = elemento('contrasena-usuario').value;
    const rol = elemento('rol-usuario').value;

    if (!nombreCompleto || !correo || !contrasena) {
      mostrarBanner('error-usuarios', 'Completa el nombre, el correo y la contraseña.');
      return;
    }

    const boton = elemento('boton-crear-usuario');
    boton.disabled = true;
    try {
      await enviarJson('/api/usuarios', 'POST', { nombreCompleto, correo, contrasena, rol });
      elemento('formulario-usuario').reset();
      await cargarUsuarios();
      mostrarBanner('exito-usuarios', 'Usuario creado: ' + nombreCompleto + '.');
    } catch (error) {
      mostrarError('error-usuarios', error);
    } finally {
      boton.disabled = false;
    }
  }

  // --- Huéspedes --------------------------------------------------------

  async function manejarCrearHuesped(evento) {
    evento.preventDefault();
    ocultarBanner('error-huesped');
    ocultarBanner('exito-huesped');

    const documentoHuesped = elemento('documento-huesped').value.trim();
    const nombreCompleto = elemento('nombre-huesped').value.trim();
    const telefono = elemento('telefono-huesped').value.trim();
    const tipoHuesped = elemento('tipo-huesped').value;

    if (!documentoHuesped || !nombreCompleto) {
      mostrarBanner('error-huesped', 'Completa el documento y el nombre del huésped.');
      return;
    }

    const cuerpo = { documento: documentoHuesped, nombreCompleto, tipoHuesped };
    // El teléfono es opcional: mandarlo vacío haría fallar la validación.
    if (telefono) cuerpo.telefono = telefono;

    const boton = elemento('boton-crear-huesped');
    boton.disabled = true;
    try {
      await enviarJson('/api/huespedes', 'POST', cuerpo);
      // Se limpia el formulario para poder cargar al siguiente huésped.
      elemento('formulario-huesped').reset();
      mostrarBanner('exito-huesped', 'Huésped registrado: ' + nombreCompleto + '.');
    } catch (error) {
      mostrarError('error-huesped', error);
    } finally {
      boton.disabled = false;
    }
  }

  // --- Menú: categorías -------------------------------------------------

  function nombreDeCategoria(categoriaId) {
    const categoria = categorias.find((item) => item.id === categoriaId);
    return categoria ? categoria.nombre : 'Categoría #' + categoriaId;
  }

  function renderizarCategorias() {
    const contenedor = elemento('contenido-categorias');
    vaciar(contenedor);

    if (categorias.length === 0) {
      contenedor.append(crearTextoVacio('No hay categorías registradas.'));
      return;
    }

    contenedor.append(crearTabla(
      ['Categoría'],
      categorias.map((categoria) => [categoria.nombre]),
      (fila, indice) => { fila.dataset.categoriaId = String(categorias[indice].id); },
    ));
  }

  function renderizarSelectorDeCategorias() {
    const selector = elemento('categoria-plato');
    vaciar(selector);
    categorias.forEach((categoria) => {
      const opcion = document.createElement('option');
      opcion.value = String(categoria.id);
      opcion.textContent = categoria.nombre;
      selector.append(opcion);
    });
  }

  // Sin categorías no se puede crear un plato: el formulario queda inerte.
  function sincronizarFormularioDePlato() {
    const hayCategorias = categorias.length > 0;
    elemento('aviso-sin-categorias').hidden = hayCategorias;
    elemento('campos-plato').disabled = !hayCategorias;
    elemento('boton-crear-plato').disabled = !hayCategorias;
  }

  async function cargarCategorias() {
    ocultarBanner('error-categorias');
    try {
      const respuesta = await window.Comun.clienteApi.peticion('/api/categorias');
      categorias = Array.isArray(respuesta) ? respuesta : [];
    } catch (error) {
      categorias = [];
      manejarFalloDeCarga('error-categorias', 'contenido-categorias', error);
      renderizarSelectorDeCategorias();
      sincronizarFormularioDePlato();
      return;
    }
    renderizarCategorias();
    renderizarSelectorDeCategorias();
    sincronizarFormularioDePlato();
  }

  async function manejarCrearCategoria(evento) {
    evento.preventDefault();
    ocultarBanner('error-categorias');
    ocultarBanner('exito-categorias');

    const nombre = elemento('nombre-categoria').value.trim();
    if (!nombre) {
      mostrarBanner('error-categorias', 'Escribe el nombre de la categoría.');
      return;
    }

    const boton = elemento('boton-crear-categoria');
    boton.disabled = true;
    try {
      await enviarJson('/api/categorias', 'POST', { nombre });
      elemento('formulario-categoria').reset();
      // Recargar repuebla también el selector del formulario de platos.
      await cargarCategorias();
      mostrarBanner('exito-categorias', 'Categoría creada: ' + nombre + '.');
    } catch (error) {
      mostrarError('error-categorias', error);
    } finally {
      boton.disabled = false;
    }
  }

  // --- Menú: platos -----------------------------------------------------

  function crearBotonDisponibilidad(plato) {
    const marcarDisponible = !plato.disponible;
    const boton = crearBoton(
      marcarDisponible ? 'Marcar disponible' : 'Marcar no disponible',
      marcarDisponible ? 'boton boton--secundario' : 'boton boton--peligro',
      () => {
        window.Comun._adminAccion = cambiarDisponibilidad(plato, marcarDisponible, boton);
      },
    );
    boton.dataset.accion = marcarDisponible ? 'disponible' : 'no-disponible';
    return boton;
  }

  function renderizarPlatos() {
    const contenedor = elemento('contenido-platos');
    vaciar(contenedor);

    if (platos.length === 0) {
      contenedor.append(crearTextoVacio('No hay platos registrados.'));
      return;
    }

    const filas = platos.map((plato) => [
      plato.nombre,
      nombreDeCategoria(plato.categoriaId),
      formatearPesos(plato.precio),
      plato.disponible ? 'Disponible' : 'No disponible',
      crearBotonDisponibilidad(plato),
    ]);

    contenedor.append(crearTabla(
      ['Plato', 'Categoría', 'Precio', 'Disponibilidad', 'Acción'],
      filas,
      (fila, indice) => { fila.dataset.platoId = String(platos[indice].id); },
    ));
  }

  async function cambiarDisponibilidad(plato, disponible, boton) {
    ocultarBanner('error-platos');
    ocultarBanner('exito-platos');
    boton.disabled = true;
    try {
      const actualizado = await enviarJson('/api/platos/' + plato.id + '/disponibilidad', 'PATCH', { disponible });
      reemplazarPorId(platos, plato.id, actualizado || Object.assign({}, plato, { disponible }));
      renderizarPlatos();
    } catch (error) {
      boton.disabled = false;
      mostrarError('error-platos', error);
    }
  }

  async function cargarPlatos() {
    ocultarBanner('error-platos');
    try {
      const respuesta = await window.Comun.clienteApi.peticion('/api/platos');
      platos = Array.isArray(respuesta) ? respuesta : [];
      renderizarPlatos();
    } catch (error) {
      platos = [];
      manejarFalloDeCarga('error-platos', 'contenido-platos', error);
    }
  }

  async function manejarCrearPlato(evento) {
    evento.preventDefault();
    ocultarBanner('error-platos');
    ocultarBanner('exito-platos');

    if (categorias.length === 0) {
      mostrarBanner('error-platos', 'Crea una categoría primero.');
      return;
    }

    const nombre = elemento('nombre-plato').value.trim();
    const categoriaId = Number(elemento('categoria-plato').value);
    const valorPrecio = elemento('precio-plato').value.trim();
    const precio = Number(valorPrecio);
    const informacion = elemento('informacion-plato').value.trim();

    if (!nombre) {
      mostrarBanner('error-platos', 'Escribe el nombre del plato.');
      return;
    }
    // El backend exige un precio entero: los pesos no llevan decimales.
    if (valorPrecio === '' || !Number.isInteger(precio) || precio < 0) {
      mostrarBanner('error-platos', 'Escribe un precio en pesos, sin decimales.');
      return;
    }

    const cuerpo = { categoriaId, nombre, precio };
    if (informacion) cuerpo.informacion = informacion;

    const boton = elemento('boton-crear-plato');
    boton.disabled = true;
    try {
      await enviarJson('/api/platos', 'POST', cuerpo);
      elemento('formulario-plato').reset();
      await cargarPlatos();
      mostrarBanner('exito-platos', 'Plato creado: ' + nombre + '.');
    } catch (error) {
      mostrarError('error-platos', error);
    } finally {
      // El formulario solo vuelve a habilitarse si sigue habiendo categorías.
      sincronizarFormularioDePlato();
    }
  }

  // --- Ingredientes -----------------------------------------------------

  function crearControlDeMovimiento(ingrediente) {
    const grupo = document.createElement('div');
    grupo.className = 'control-stock';

    const entradaDelta = document.createElement('input');
    entradaDelta.type = 'number';
    entradaDelta.className = 'entrada-numerica entrada-stock';
    entradaDelta.step = '0.01';
    entradaDelta.placeholder = '+/-';
    entradaDelta.setAttribute('aria-label', 'Cantidad a sumar o restar del stock de ' + ingrediente.nombre);

    const selectMotivo = document.createElement('select');
    selectMotivo.setAttribute('aria-label', 'Motivo del movimiento de ' + ingrediente.nombre);
    const opcionVacia = document.createElement('option');
    opcionVacia.value = '';
    opcionVacia.textContent = 'Motivo…';
    selectMotivo.append(opcionVacia);
    ['compra', 'merma', 'ajuste'].forEach((motivo) => {
      const opcion = document.createElement('option');
      opcion.value = motivo;
      opcion.textContent = ETIQUETAS_MOTIVO_MOVIMIENTO[motivo];
      selectMotivo.append(opcion);
    });

    const boton = crearBoton('Registrar movimiento', 'boton boton--secundario', () => {
      window.Comun._adminAccion = registrarMovimientoDeIngrediente(ingrediente, entradaDelta, selectMotivo, boton);
    });
    boton.dataset.accion = 'registrar-movimiento';

    grupo.append(entradaDelta, selectMotivo, boton);
    return grupo;
  }

  function celdasDeIngrediente(ingrediente) {
    return [
      ingrediente.nombre,
      formatearCantidad(ingrediente.cantidadStock),
      ingrediente.unidadMedida,
      crearControlDeMovimiento(ingrediente),
    ];
  }

  function poblarSelectDeHistorial() {
    const select = elemento('ingrediente-historial');
    vaciar(select);
    if (ingredientes.length === 0) {
      const opcion = document.createElement('option');
      opcion.value = '';
      opcion.textContent = 'No hay ingredientes';
      select.append(opcion);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    ingredientes.forEach((ingrediente) => {
      const opcion = document.createElement('option');
      opcion.value = String(ingrediente.id);
      opcion.textContent = ingrediente.nombre;
      select.append(opcion);
    });
  }

  function renderizarIngredientes() {
    const contenedor = elemento('contenido-ingredientes');
    vaciar(contenedor);
    poblarSelectDeHistorial();

    if (ingredientes.length === 0) {
      contenedor.append(crearTextoVacio('No hay ingredientes registrados.'));
      return;
    }

    contenedor.append(crearTabla(
      ['Ingrediente', 'Stock actual', 'Unidad de medida', 'Registrar movimiento'],
      ingredientes.map(celdasDeIngrediente),
      (fila, indice) => { fila.dataset.ingredienteId = String(ingredientes[indice].id); },
    ));
  }

  // Repinta solo la fila guardada. Repintar toda la tabla borraría lo que el
  // admin ya escribió en los inputs de las demás filas y aún no ha guardado.
  function repintarFilaDeIngrediente(ingrediente) {
    const fila = document.querySelector(
      '#contenido-ingredientes tr[data-ingrediente-id="' + ingrediente.id + '"]',
    );
    if (!fila) {
      renderizarIngredientes();
      return;
    }

    const nueva = document.createElement('tr');
    celdasDeIngrediente(ingrediente).forEach((contenido) => nueva.append(crearCelda(contenido)));
    nueva.dataset.ingredienteId = String(ingrediente.id);
    fila.replaceWith(nueva);
  }

  async function registrarMovimientoDeIngrediente(ingrediente, entradaDelta, selectMotivo, boton) {
    ocultarBanner('error-ingredientes');
    ocultarBanner('exito-ingredientes');

    const valor = entradaDelta.value.trim();
    const delta = Number(valor);
    if (valor === '' || !Number.isFinite(delta) || delta === 0) {
      mostrarBanner('error-ingredientes', 'Escribe una cantidad distinta de cero (positiva para sumar, negativa para restar).');
      return;
    }
    const motivo = selectMotivo.value;
    if (!motivo) {
      mostrarBanner('error-ingredientes', 'Selecciona un motivo para el movimiento.');
      return;
    }

    boton.disabled = true;
    try {
      const movimiento = await enviarJson('/api/ingredientes/' + ingrediente.id + '/movimientos', 'POST', { delta, motivo });
      const registro = Object.assign({}, ingrediente, { cantidadStock: movimiento.cantidadResultante });
      reemplazarPorId(ingredientes, ingrediente.id, registro);
      repintarFilaDeIngrediente(registro);
      mostrarBanner('exito-ingredientes', 'Movimiento registrado: ' + ingrediente.nombre + '.');
    } catch (error) {
      boton.disabled = false;
      mostrarError('error-ingredientes', error);
    }
  }

  async function cargarIngredientes() {
    ocultarBanner('error-ingredientes');
    try {
      const respuesta = await window.Comun.clienteApi.peticion('/api/ingredientes');
      ingredientes = Array.isArray(respuesta) ? respuesta : [];
      renderizarIngredientes();
    } catch (error) {
      ingredientes = [];
      manejarFalloDeCarga('error-ingredientes', 'contenido-ingredientes', error);
    }
  }

  async function manejarCrearIngrediente(evento) {
    evento.preventDefault();
    ocultarBanner('error-ingredientes');
    ocultarBanner('exito-ingredientes');

    const nombre = elemento('nombre-ingrediente').value.trim();
    const valorCantidad = elemento('cantidad-ingrediente').value.trim();
    const cantidadStock = Number(valorCantidad);
    const unidadMedida = elemento('unidad-ingrediente').value.trim();

    if (!nombre || !unidadMedida) {
      mostrarBanner('error-ingredientes', 'Completa el nombre y la unidad de medida.');
      return;
    }
    if (valorCantidad === '' || !Number.isFinite(cantidadStock) || cantidadStock < 0) {
      mostrarBanner('error-ingredientes', 'Escribe una cantidad inicial válida (cero o mayor).');
      return;
    }

    const boton = elemento('boton-crear-ingrediente');
    boton.disabled = true;
    try {
      await enviarJson('/api/ingredientes', 'POST', { nombre, cantidadStock, unidadMedida });
      elemento('formulario-ingrediente').reset();
      await cargarIngredientes();
      mostrarBanner('exito-ingredientes', 'Ingrediente creado: ' + nombre + '.');
    } catch (error) {
      mostrarError('error-ingredientes', error);
    } finally {
      boton.disabled = false;
    }
  }

  // --- Historial de movimientos -------------------------------------------

  function formatearFecha(valor) {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? String(valor) : fecha.toLocaleString('es-CO');
  }

  function formatearDelta(valor) {
    const numero = Number(valor);
    return (numero > 0 ? '+' : '') + formatearCantidad(numero);
  }

  function renderizarHistorial(movimientos) {
    const contenedor = elemento('contenido-historial-movimientos');
    vaciar(contenedor);

    if (movimientos.length === 0) {
      contenedor.append(crearTextoVacio('Este ingrediente no tiene movimientos registrados.'));
      return;
    }

    contenedor.append(crearTabla(
      ['Fecha', 'Movimiento', 'Motivo', 'Usuario', 'Stock resultante'],
      movimientos.map((movimiento) => [
        formatearFecha(movimiento.creadoEn),
        formatearDelta(movimiento.delta),
        ETIQUETAS_MOTIVO_MOVIMIENTO[movimiento.motivo] || movimiento.motivo,
        movimiento.usuarioNombre,
        formatearCantidad(movimiento.cantidadResultante),
      ]),
    ));
  }

  async function verHistorialDeIngrediente() {
    ocultarBanner('error-historial-movimientos');
    const id = elemento('ingrediente-historial').value;
    if (!id) return;

    const boton = elemento('boton-ver-historial');
    boton.disabled = true;
    try {
      const movimientos = await window.Comun.clienteApi.peticion('/api/ingredientes/' + id + '/movimientos');
      renderizarHistorial(Array.isArray(movimientos) ? movimientos : []);
    } catch (error) {
      vaciar(elemento('contenido-historial-movimientos'));
      mostrarError('error-historial-movimientos', error);
    } finally {
      boton.disabled = false;
    }
  }

  // --- Arranque ---------------------------------------------------------

  // Las categorías se cargan antes que los platos: la tabla de platos cruza
  // el categoriaId contra ellas para mostrar el nombre de la categoría.
  async function cargarMenu() {
    await cargarCategorias();
    await cargarPlatos();
  }

  function iniciarPanelAdmin(usuario) {
    usuarioActual = usuario || null;
    elemento('formulario-usuario').addEventListener('submit', manejarCrearUsuario);
    elemento('formulario-huesped').addEventListener('submit', manejarCrearHuesped);
    elemento('formulario-categoria').addEventListener('submit', manejarCrearCategoria);
    elemento('formulario-plato').addEventListener('submit', manejarCrearPlato);
    elemento('formulario-ingrediente').addEventListener('submit', manejarCrearIngrediente);
    elemento('boton-ver-historial').addEventListener('click', () => {
      window.Comun._adminAccion = verHistorialDeIngrediente();
    });
    sincronizarFormularioDePlato();

    // Cada sección atrapa su propio error: un fallo no tumba a las demás.
    window.Comun._adminCargando = Promise.all([cargarUsuarios(), cargarMenu(), cargarIngredientes()]);
  }

  window.Comun._panelListo = window.Comun.panel.inicializar({
    rolEsperado: 'admin',
    alListo: iniciarPanelAdmin,
  });
})();
