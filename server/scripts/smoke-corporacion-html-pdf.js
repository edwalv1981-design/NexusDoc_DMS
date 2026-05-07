/**
 * Smoke test: genera PDF Corporación (HTML) y valida bytes + número de páginas.
 * Uso: desde carpeta `server`: `node scripts/smoke-corporacion-html-pdf.js`
 * Requiere Puppeteer/Chromium (mismas deps que producción / Dockerfile).
 */
'use strict';

const path = require('path');
const pdfParse = require('pdf-parse');
const corporacionLayoutGuard = require('../services/corporacionLayoutGuard');
const corporacionHtmlPdfService = require('../services/corporacionHtmlPdfService');

function rowDirector(i) {
  return {
    firstName: 'Nom',
    secondName: '',
    lastName: `Dir${i}`,
    birthDate: '1990-01-15',
    maritalStatus: 'Single',
    nationality: 'PA',
    passport: `P${i}000`,
    phone: '60000000',
    email: `d${i}@t.test`,
    address: 'Addr',
    city: 'PTY',
    country: 'PA',
  };
}

function rowSh(i) {
  return {
    certificate: `C${i}`,
    value: '1',
    shares: '100',
    name: `Shareholder ${i}`,
    address: 'SH addr',
  };
}

async function main() {
  const serverDir = path.join(__dirname, '..');
  process.chdir(serverDir);

  corporacionLayoutGuard.assertCorporacionPdfLayoutInvariants();

  const data = {
    corpNameSA: 'Smoke Test SA',
    corpNameCorp: 'Smoke Test Corp',
    corpNameInc: 'Smoke Test Inc',
    capitalSocial: '50000',
    dignitaries: {
      presidente: { fullName: 'Pres', birthDate: '1980-02-02', passport: 'P1', registrationNumber: 'R1' },
      secretario: { fullName: 'Sec', birthDate: '1981-03-03', passport: 'P2', registrationNumber: 'R2' },
      tesorero: { fullName: 'Tes', birthDate: '1982-04-04', passport: 'P3', registrationNumber: 'R3' },
    },
    directors: Array.from({ length: 8 }, (_, i) => rowDirector(i + 1)),
    shareholders: Array.from({ length: 14 }, (_, i) => rowSh(i + 1)),
    companyActivities: 'Actividad de prueba.\n'.repeat(180),
    declarationName: 'Firma',
    declarationDate: '2026-05-07',
  };

  let buf = await corporacionHtmlPdfService.generatePdf(data);
  if (buf instanceof Uint8Array && !Buffer.isBuffer(buf)) {
    buf = Buffer.from(buf);
  }
  if (!Buffer.isBuffer(buf) || buf.length < 4000) {
    throw new Error(
      `PDF buffer inválido o demasiado pequeño (tipo=${buf?.constructor?.name} len=${buf?.length})`
    );
  }
  const head = buf.subarray(0, 5).toString('utf8');
  if (head !== '%PDF-') {
    throw new Error(`Cabecera PDF inesperada: ${JSON.stringify(head)}`);
  }

  const meta = await pdfParse(buf);
  if (meta.numpages < 1) {
    throw new Error(`numpages inválido: ${meta.numpages}`);
  }
  if (meta.numpages < 2) {
    console.warn(
      '[smoke] PDF de una sola página (ok); para forzar multipágina aumentar companyActivities o filas.'
    );
  }

  console.log('[smoke-corporacion-html-pdf] OK', {
    bytes: buf.length,
    numpages: meta.numpages,
  });
}

main().catch((err) => {
  console.error('[smoke-corporacion-html-pdf] FAIL', err);
  process.exit(1);
});
