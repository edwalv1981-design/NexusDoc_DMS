'use strict';

/**
 * Middleware Anti-Bot / Anti-Scraping / Anti-IA
 * Bloquea rastreadores automatizados maliciosos y bots de extracción de datos.
 */

const KNOWN_BOT_USER_AGENTS = [
  /python-requests/i,
  /go-http-client/i,
  /curl\//i,
  /wget\//i,
  /scrapy/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer-extra/i,
];

module.exports = function botProtection(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';

  // Permitir health checks e inspecciones internas
  if (req.path === '/health' || req.path === '/ready') {
    return next();
  }

  // Detectar User-Agents automatizados no autorizados en rutas API
  if (req.path.startsWith('/api/')) {
    const isSuspiciousBot = KNOWN_BOT_USER_AGENTS.some((pattern) => pattern.test(userAgent));
    if (isSuspiciousBot) {
      console.warn(`[Anti-Bot] Petición bloqueada desde User-Agent sospechoso: ${userAgent} en ${req.path}`);
      return res.status(403).json({ msg: 'Acceso denegado por políticas de protección de seguridad.' });
    }
  }

  // Verificación de campo Trampa (Honeypot) en envíos POST/PUT
  if ((req.method === 'POST' || req.method === 'PUT') && req.body && typeof req.body === 'object') {
    if (req.body.website_hp || req.body.honeypot_check) {
      console.warn(`[Anti-Bot] Trampa Honeypot activada en ${req.path}. Petición descartada.`);
      return res.status(400).json({ msg: 'Solicitud rechazada.' });
    }
  }

  next();
};
