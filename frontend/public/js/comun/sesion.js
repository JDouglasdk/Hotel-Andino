window.Comun = window.Comun || {};

window.Comun.sesion = {
  async verificar({ rolEsperado, alRedirigir = (destino) => { window.location.href = destino; } }) {
    let respuesta;
    try {
      respuesta = await fetch('/api/auth/yo', { credentials: 'include' });
    } catch (error) {
      return { error: 'RED' };
    }

    if (respuesta.status === 401) {
      alRedirigir('/login');
      return null;
    }

    if (!respuesta.ok) {
      return { error: 'RED' };
    }

    let usuario;
    try {
      usuario = await respuesta.json();
    } catch {
      return { error: 'RED' };
    }

    if (usuario.rol !== rolEsperado) {
      alRedirigir(`/${usuario.rol}`);
      return null;
    }

    return usuario;
  },
};
