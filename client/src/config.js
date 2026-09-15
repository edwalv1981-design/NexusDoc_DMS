// Configuración Dinámica de Grado Industrial
// Detectamos el origen en tiempo de ejecución para evitar fallos de compilación

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// Garantizamos el origen absoluto en producción para evitar desvíos en rutas cliente (/admin)
const API_BASE_URL = isLocalhost ? 'http://localhost:5000' : window.location.origin;

console.log(`🚀 Sistema NexusDoc DMS detectado en: ${window.location.hostname}`);
console.log(`📡 Apuntando API a: ${API_BASE_URL}`);

export default API_BASE_URL;
