window.Comun = window.Comun || {};

(function () {
  const ETIQUETAS_ROL = {
    admin: 'Administrador',
    mesero: 'Mesero',
    cocina: 'Cocina',
    jefeDeCaja: 'Jefe de caja',
  };

  window.Comun.header = {
    construir({ documento = document, contenedor, usuario }) {
      const header = documento.createElement('header');
      header.className = 'encabezado';

      const marca = documento.createElement('span');
      marca.className = 'encabezado-marca';
      marca.textContent = 'Hotel Andino — Restaurante';

      const etiquetaRol = documento.createElement('span');
      etiquetaRol.className = `encabezado-rol encabezado-rol--${usuario.rol}`;
      etiquetaRol.textContent = ETIQUETAS_ROL[usuario.rol] || usuario.rol;

      const grupoIzquierda = documento.createElement('div');
      grupoIzquierda.className = 'encabezado-grupo';
      grupoIzquierda.append(marca, etiquetaRol);

      const nombre = documento.createElement('span');
      nombre.className = 'encabezado-nombre';
      nombre.textContent = usuario.nombreCompleto;

      const botonSalir = documento.createElement('button');
      botonSalir.type = 'button';
      botonSalir.className = 'encabezado-salir';
      botonSalir.setAttribute('aria-label', 'Cerrar sesión');
      botonSalir.textContent = 'Salir';
      botonSalir.addEventListener('click', () => {
        window.Comun.dialogo.abrir({
          documento,
          mensaje: '¿Cerrar sesión?',
          alConfirmar: async () => {
            try {
              await window.Comun.clienteApi.peticion('/api/auth/logout', { method: 'POST' });
            } catch (error) {
              if (error && error.tipo === 'RED') {
                window.Comun.dialogo.abrir({
                  documento,
                  mensaje: 'No se pudo cerrar sesión. Verifica tu conexión e intenta de nuevo.',
                  soloCerrar: true,
                });
                return;
              }
              // SESION_EXPIRADA: ya no había sesión en el servidor, nada que hacer.
              // NEGOCIO: el backend rechazó el logout; igual redirigimos, reintentar
              // un logout que ya devolvió 4xx no suele resolverse solo.
            }
            window.location.href = '/login';
          },
        });
      });

      const grupoDerecha = documento.createElement('div');
      grupoDerecha.className = 'encabezado-grupo';
      grupoDerecha.append(nombre, botonSalir);

      header.append(grupoIzquierda, grupoDerecha);
      contenedor.append(header);

      return { elemento: header };
    },
  };
})();
