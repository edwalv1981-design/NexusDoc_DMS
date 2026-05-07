/**
 * Utilidades compartidas para smoke tests del PDF Corporación (HTML).
 */
'use strict';

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
    address: 'Addr larga para stress de tabla y evitar columnas vacías.',
    city: 'PTY',
    country: 'PA',
  };
}

function rowSh(i) {
  return {
    certificate: `C${i}`,
    value: '1',
    shares: '100',
    name: `Shareholder ${i} nombre extendido para ancho`,
    address: 'Dirección accionista con texto suficiente para stress.',
  };
}

function baseFormFields() {
  return {
    corpNameSA: 'Smoke Test SA',
    corpNameCorp: 'Smoke Test Corp',
    corpNameInc: 'Smoke Test Inc',
    capitalSocial: '50000',
    dignitaries: {
      presidente: { fullName: 'Pres', birthDate: '1980-02-02', passport: 'P1', registrationNumber: 'R1' },
      secretario: { fullName: 'Sec', birthDate: '1981-03-03', passport: 'P2', registrationNumber: 'R2' },
      tesorero: { fullName: 'Tes', birthDate: '1982-04-04', passport: 'P3', registrationNumber: 'R3' },
    },
    declarationName: 'Firma',
    declarationDate: '2026-05-07',
  };
}

/** Payload similar a formularios medianos (CI rápido). */
function defaultSmokePayload() {
  return {
    ...baseFormFields(),
    directors: Array.from({ length: 8 }, (_, i) => rowDirector(i + 1)),
    shareholders: Array.from({ length: 14 }, (_, i) => rowSh(i + 1)),
    companyActivities: 'Actividad de prueba.\n'.repeat(180),
  };
}

/**
 * Muchos directores/accionistas + actividad larga: activa compact + split-tail
 * (mismos umbrales que `analyzeFormData`).
 */
function heavySmokePayload() {
  return {
    ...baseFormFields(),
    directors: Array.from({ length: 15 }, (_, i) => rowDirector(i + 1)),
    shareholders: Array.from({ length: 28 }, (_, i) => rowSh(i + 1)),
    companyActivities: 'Actividad corporativa detallada para stress de PDF.\n'.repeat(140),
  };
}

async function normalizePdfBuffer(buf) {
  let b = buf;
  if (b instanceof Uint8Array && !Buffer.isBuffer(b)) {
    b = Buffer.from(b);
  }
  if (!Buffer.isBuffer(b) || b.length < 4000) {
    throw new Error(
      `PDF buffer inválido o demasiado pequeño (tipo=${b?.constructor?.name} len=${b?.length})`
    );
  }
  const head = b.subarray(0, 5).toString('utf8');
  if (head !== '%PDF-') {
    throw new Error(`Cabecera PDF inesperada: ${JSON.stringify(head)}`);
  }
  return b;
}

/**
 * Genera PDF y valida integridad. No depende de DB.
 * @param {object} data payload Corporación
 * @param {string} label log
 */
async function runCorporacionPdfSmoke(data, label) {
  corporacionLayoutGuard.assertCorporacionPdfLayoutInvariants();
  const buf = await normalizePdfBuffer(await corporacionHtmlPdfService.generatePdf(data));
  const meta = await pdfParse(buf);
  if (meta.numpages < 1) {
    throw new Error(`numpages inválido: ${meta.numpages}`);
  }
  const out = { bytes: buf.length, numpages: meta.numpages };
  console.log(`[${label}] OK`, out);
  return out;
}

module.exports = {
  rowDirector,
  rowSh,
  defaultSmokePayload,
  heavySmokePayload,
  runCorporacionPdfSmoke,
  normalizePdfBuffer,
};
