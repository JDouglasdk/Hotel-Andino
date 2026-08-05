window.Comun = window.Comun || {};

window.Comun.clienteApi = {
  async peticion(ruta, opciones = {}, { alRedirigir = (destino) => { window.location.href = destino; } } = {}) {
    let respuesta;

    try {
      respuesta = await fetch(ruta, { ...opciones, credentials: 'include' });
    } catch (error) {
      throw { tipo: 'RED' };
    }

    if (respuesta.status === 401) {
      window.Comun.dialogo.abrir({
        mensaje: 'Tu sesión venció. Ingresa de nuevo.',
        textoConfirmar: 'Entendido',
        alConfirmar: () => alRedirigir('/login'),
      });
      throw { tipo: 'SESION_EXPIRADA' };
    }

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => null);
      throw {
        tipo: 'NEGOCIO',
        status: respuesta.status,
        codigo: cuerpo && cuerpo.error ? cuerpo.error.codigo : undefined,
        mensaje: cuerpo && cuerpo.error ? cuerpo.error.mensaje : undefined,
      };
    }

    if (respuesta.status === 204) return null;
    return respuesta.json();
  },
};
