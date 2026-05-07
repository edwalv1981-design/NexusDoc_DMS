/**
 * Smoke pesado: muchos directores y accionistas (techo 25 accionistas) + actividad larga.
 * Confirma que el PDF sigue siendo válido y multipágina sin romper márgenes/CSS guard.
 *
 * Uso: `cd server && npm run test:smoke-corporacion-pdf-heavy`
 */
'use strict';

const path = require('path');
const corporacionLayoutGuard = require('../services/corporacionLayoutGuard');
const { buildHeavyPdfStressSpec, runCorporacionPdfSmoke } = require('./corporacionPdfSmokeLib');

async function main() {
  process.chdir(path.join(__dirname, '..'));

  const spec = buildHeavyPdfStressSpec();
  const data = spec.payload;

  const plan = corporacionLayoutGuard.analyzeFormData(data);
  if (plan.density !== 'very_high') {
    throw new Error(`heavy smoke: se esperaba density very_high, obtuvo ${plan.density}`);
  }
  if (plan.tailKeepTogether !== false) {
    throw new Error('heavy smoke: tailKeepTogether debería ser false con este volumen');
  }
  if (plan.shareholders !== spec.shareholderCount || plan.directors !== spec.directorCount) {
    throw new Error(
      `heavy smoke: conteo plan ${plan.directors}/${plan.shareholders} !== spec ${spec.directorCount}/${spec.shareholderCount}`
    );
  }

  const r = await runCorporacionPdfSmoke(data, 'smoke-corporacion-html-pdf-heavy');
  if (r.numpages < spec.minExpectedPages) {
    throw new Error(
      `heavy smoke: se esperaban al menos ${spec.minExpectedPages} páginas (derivado del spec), obtuvo ${r.numpages}`
    );
  }
  if (r.bytes < spec.minBytes) {
    throw new Error(
      `heavy smoke: PDF por debajo del mínimo de bytes (${spec.minBytes}, derivado del spec), obtuvo ${r.bytes}`
    );
  }

  console.log('[smoke-corporacion-html-pdf-heavy] spec', {
    shareholders: spec.shareholderCount,
    directors: spec.directorCount,
    activitiesLines: spec.activitiesLines,
    activitiesChars: spec.activitiesCharLength,
    minExpectedPages: spec.minExpectedPages,
    minBytes: spec.minBytes,
  });
}

main().catch((err) => {
  console.error('[smoke-corporacion-html-pdf-heavy] FAIL', err);
  process.exit(1);
});
