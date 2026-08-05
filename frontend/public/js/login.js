// frontend/public/js/login.js
window.Comun = window.Comun || {};

(function inicializarLogin() {
  function redirigir(ruta) {
    (window.Comun._loginRedirigir || ((destino) => { window.location.href = destino; }))(ruta);
  }

  function mostrarError(mensaje) {
    const banner = document.getElementById('error-login');
    banner.textContent = mensaje;
    banner.hidden = false;
  }

  function ocultarError() {
    document.getElementById('error-login').hidden = true;
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    const boton = document.getElementById('boton-ingresar');
    boton.disabled = true;
    ocultarError();

    try {
      const respuesta = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: document.getElementById('correo').value,
          contrasena: document.getElementById('contrasena').value,
        }),
      });

      if (respuesta.status === 429) {
        mostrarError('Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.');
        return;
      }

      if (respuesta.status !== 200) {
        const cuerpo = await respuesta.json();
        mostrarError(cuerpo.error.mensaje);
        return;
      }

      const usuario = await respuesta.json();
      redirigir(`/${usuario.rol}`);
    } catch (error) {
      mostrarError('No se pudo conectar. Intenta de nuevo.');
    } finally {
      boton.disabled = false;
    }
  }

  async function verificarSesionExistente() {
    let respuesta;
    try {
      respuesta = await fetch('/api/auth/yo', { credentials: 'include' });
    } catch (error) {
      return false;
    }
    if (respuesta.status === 200) {
      const usuario = await respuesta.json();
      redirigir(`/${usuario.rol}`);
      return true;
    }
    return false;
  }

  async function inicializar() {
    document.getElementById('boton-olvide-contrasena').addEventListener('click', () => {
      window.Comun.dialogo.abrir({
        titulo: 'Contacta al administrador',
        mensaje: 'Solo el administrador puede restablecer tu contraseña. Contáctalo por fuera de la plataforma para que te genere una nueva.',
        soloCerrar: true,
      });
    });

    const yaHabiaSesion = await verificarSesionExistente();
    if (yaHabiaSesion) return;

    document.getElementById('cargando-login').hidden = true;
    document.getElementById('formulario-login').hidden = false;
    document.getElementById('formulario-login').addEventListener('submit', manejarEnvio);
  }

  window.Comun._loginListo = inicializar();
})();
