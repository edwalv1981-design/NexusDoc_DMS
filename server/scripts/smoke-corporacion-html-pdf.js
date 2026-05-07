/**
 * Smoke test: genera PDF Corporación (HTML) y valida bytes + número de páginas.
 * Uso: desde carpeta `server`: `node scripts/smoke-corporacion-html-pdf.js`
 * Requiere Puppeteer/Chromium (mismas deps que producción / Dockerfile).
 */
'use strict';

const path = require('path');
const { defaultSmokePayload, runCorporacionPdfSmoke } = require('./corporacionPdfSmokeLib');

async function main() {
  process.chdir(path.join(__dirname, '..'));
  const r = await runCorporacionPdfSmoke(defaultSmokePayload(), 'smoke-corporacion-html-pdf');
  if (r.numpages < 2) {
    console.warn(
      '[smoke] PDF de una sola página (ok); para forzar multipágina aumentar companyActivities o filas.'
    );
  }
}

main().catch((err) => {
  console.error('[smoke-corporacion-html-pdf] FAIL', err);
  process.exit(1);
});
