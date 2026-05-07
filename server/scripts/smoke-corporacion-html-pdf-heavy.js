/**
 * Smoke pesado: muchos directores y accionistas + actividad larga.
 * Confirma que el PDF sigue siendo válido y multipágina sin romper márgenes/CSS guard.
 *
 * Uso: `cd server && npm run test:smoke-corporacion-pdf-heavy`
 */
'use strict';

const path = require('path');
const corporacionLayoutGuard = require('../services/corporacionLayoutGuard');
const { heavySmokePayload, runCorporacionPdfSmoke } = require('./corporacionPdfSmokeLib');

async function main() {
  process.chdir(path.join(__dirname, '..'));

  const data = heavySmokePayload();
  const plan = corporacionLayoutGuard.analyzeFormData(data);
  if (plan.density !== 'very_high') {
    throw new Error(`heavy smoke: se esperaba density very_high, obtuvo ${plan.density}`);
  }
  if (plan.tailKeepTogether !== false) {
    throw new Error('heavy smoke: tailKeepTogether debería ser false con este volumen');
  }

  const r = await runCorporacionPdfSmoke(data, 'smoke-corporacion-html-pdf-heavy');
  if (r.numpages < 4) {
    throw new Error(`heavy smoke: se esperaban al menos 4 páginas, obtuvo ${r.numpages}`);
  }
  if (r.bytes < 80_000) {
    throw new Error(`heavy smoke: PDF sospechosamente pequeño (${r.bytes} bytes)`);
  }
}

main().catch((err) => {
  console.error('[smoke-corporacion-html-pdf-heavy] FAIL', err);
  process.exit(1);
});
