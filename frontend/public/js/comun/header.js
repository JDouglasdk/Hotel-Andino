window.Comun = window.Comun || {};

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
            // Si ya no había sesión, clienteApi ya mostró su propio aviso.
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
