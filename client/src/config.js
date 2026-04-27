// Configuración Dinámica de Grado Industrial
// Detectamos el origen en tiempo de ejecución para evitar fallos de compilación

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// En Railway usamos la ruta relativa '/' para que el navegador resuelva el dominio actual automáticamente.
const API_BASE_URL = isLocalhost ? 'http://localhost:5000' : '';

console.log(`🚀 Sistema NexusDoc DMS detectado en: ${window.location.hostname}`);
console.log(`📡 Apuntando API a: ${API_BASE_URL || 'Ruta Relativa (Producción)'}`);

export default API_BASE_URL;
