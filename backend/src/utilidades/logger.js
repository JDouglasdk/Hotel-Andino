function formatear(nivel, mensaje, contexto) {
  return JSON.stringify({ marcaDeTiempo: new Date().toISOString(), nivel, mensaje, ...contexto });
}

const logger = {
  info(mensaje, contexto = {}) {
    console.log(formatear('info', mensaje, contexto));
  },
  warn(mensaje, contexto = {}) {
    console.warn(formatear('warn', mensaje, contexto));
  },
  error(mensaje, contexto = {}) {
    console.error(formatear('error', mensaje, contexto));
  },
};

module.exports = { logger };
