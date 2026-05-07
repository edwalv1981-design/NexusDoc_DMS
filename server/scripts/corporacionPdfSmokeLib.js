/**
 * Utilidades compartidas para smoke tests del PDF Corporación (HTML).
 */
'use strict';

const pdfParse = require('pdf-parse');
const corporacionLayoutGuard = require('../services/corporacionLayoutGuard');
const corporacionHtmlPdfService = require('../services/corporacionHtmlPdfService');

/** Techo de accionistas en smoke pesado (alinear con reglas de negocio / formulario). */
const HEAVY_PDF_STRESS_CEILING_SHAREHOLDERS = 25;
/** Techo de directores en smoke pesado (tabla ancha; suficiente para very_high con accionistas al máximo). */
const HEAVY_PDF_STRESS_CEILING_DIRECTORS = 15;
/** Líneas de texto de actividad (cada línea ~48 chars → >5000 chars para `very_high`). */
const HEAVY_PDF_STRESS_ACTIVITIES_LINES_DEFAULT = 140;

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

/**
 * Valida y normaliza conteos del smoke pesado (techo 25 accionistas).
 * Si se pide más del techo → Error (hay que subir la constante a propósito).
 *
 * @param {object} [opts]
 * @param {number} [opts.shareholders] por defecto techo
 * @param {number} [opts.directors] por defecto techo directores
 * @param {number} [opts.activitiesLines] repeticiones de línea de actividad
 * @returns {{
 *   shareholderCount: number,
 *   directorCount: number,
 *   activitiesLines: number,
 *   activitiesCharLength: number,
 *   minExpectedPages: number,
 *   minBytes: number,
 *   payload: object,
 * }}
 */
function buildHeavyPdfStressSpec(opts = {}) {
  let sh = opts.shareholders != null ? Number(opts.shareholders) : HEAVY_PDF_STRESS_CEILING_SHAREHOLDERS;
  let dir = opts.directors != null ? Number(opts.directors) : HEAVY_PDF_STRESS_CEILING_DIRECTORS;
  let lines = opts.activitiesLines != null ? Number(opts.activitiesLines) : HEAVY_PDF_STRESS_ACTIVITIES_LINES_DEFAULT;

  if (!Number.isFinite(sh) || !Number.isInteger(sh) || sh < 1) {
    throw new Error(`heavy PDF stress: shareholders inválido (${opts.shareholders})`);
  }
  if (!Number.isFinite(dir) || !Number.isInteger(dir) || dir < 3) {
    throw new Error(`heavy PDF stress: directors inválido (${opts.directors}); mínimo 3`);
  }
  if (!Number.isFinite(lines) || !Number.isInteger(lines) || lines < 80) {
    throw new Error(`heavy PDF stress: activitiesLines inválido (${opts.activitiesLines}); mínimo 80`);
  }

  if (sh > HEAVY_PDF_STRESS_CEILING_SHAREHOLDERS) {
    throw new Error(
      `heavy PDF stress: accionistas=${sh} supera el techo ${HEAVY_PDF_STRESS_CEILING_SHAREHOLDERS}. ` +
        'Sube HEAVY_PDF_STRESS_CEILING_SHAREHOLDERS solo si el negocio lo permite.'
    );
  }
  if (dir > HEAVY_PDF_STRESS_CEILING_DIRECTORS) {
    throw new Error(
      `heavy PDF stress: directores=${dir} supera el techo ${HEAVY_PDF_STRESS_CEILING_DIRECTORS}. ` +
        'Ajusta HEAVY_PDF_STRESS_CEILING_DIRECTORS si necesitas más filas en el smoke.'
    );
  }

  const activityLine = 'Actividad corporativa detallada para stress de PDF.\n';
  const companyActivities = activityLine.repeat(lines);
  const activitiesCharLength = companyActivities.length;

  const payload = {
    ...baseFormFields(),
    directors: Array.from({ length: dir }, (_, i) => rowDirector(i + 1)),
    shareholders: Array.from({ length: sh }, (_, i) => rowSh(i + 1)),
    companyActivities,
  };

  /** Mínimo de páginas: conservador según filas (empírico con márgenes @page actuales). */
  const minExpectedPages = Math.max(
    3,
    sh > 20 || dir > 12 ? 4 : 3,
    Math.ceil(sh / 12) + Math.ceil(dir / 10) - 1
  );

  /** Tamaño mínimo del PDF en bytes (crece con tablas). */
  const minBytes = 55_000 + sh * 2_800 + dir * 2_200 + Math.floor(lines / 20) * 1_000;

  return {
    shareholderCount: sh,
    directorCount: dir,
    activitiesLines: lines,
    activitiesCharLength,
    minExpectedPages,
    minBytes,
    payload,
    ceilings: {
      shareholders: HEAVY_PDF_STRESS_CEILING_SHAREHOLDERS,
      directors: HEAVY_PDF_STRESS_CEILING_DIRECTORS,
    },
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
 * Smoke pesado al **techo** configurado (25 accionistas por defecto).
 * Opcional: `heavySmokePayload({ shareholders: 20, directors: 12 })` dentro del techo.
 */
function heavySmokePayload(opts = {}) {
  return buildHeavyPdfStressSpec(opts).payload;
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
  HEAVY_PDF_STRESS_CEILING_SHAREHOLDERS,
  HEAVY_PDF_STRESS_CEILING_DIRECTORS,
  HEAVY_PDF_STRESS_ACTIVITIES_LINES_DEFAULT,
  rowDirector,
  rowSh,
  buildHeavyPdfStressSpec,
  defaultSmokePayload,
  heavySmokePayload,
  runCorporacionPdfSmoke,
  normalizePdfBuffer,
};
