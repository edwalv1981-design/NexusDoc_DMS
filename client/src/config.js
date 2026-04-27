// Configuración inteligente de API
// Si estamos en producción (Railway), usamos rutas relativas.
// Si estamos en desarrollo, usamos localhost.
const API_BASE_URL = import.meta.env.MODE === 'production' 
    ? '' 
    : 'http://localhost:5000';

export default API_BASE_URL;
