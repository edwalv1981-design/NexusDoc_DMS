'use strict';

/**
 * Versiones de plantilla subidas por el administrador (los 5 formularios del sistema).
 *
 * Regla de oro (retrocompatibilidad):
 * - Mientras no exista una versión ACTIVA para un tipo de formulario, ese formulario sigue
 *   funcionando exactamente como antes (formulario fijo + motor HTML del PDF).
 * - Al subir una plantilla nueva se crea una versión y queda activa para los trámites NUEVOS.
 * - Cada trámite guarda en data.__templateVersion la versión con la que se llenó; los trámites
 *   anteriores (sin esa marca) siguen con el formulario y PDF de siempre.
 * - Nada se borra: las versiones anteriores quedan guardadas y se pueden reactivar.
 *
 * Tabla propia "FormTemplateVersions" (aditiva, CREATE TABLE IF NOT EXISTS).
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { resolvePythonCommand } = require('../utils/pythonCommand');
const { reconcileSchema, isSafeToAutoActivate } = require('./templateReconcile');

const ENGINE_SCRIPT = path.join(__dirname, '../scripts/template_engine.py');
const TABLE = '"FormTemplateVersions"';

/** Id del administrador (selector de plantillas) -> tipo de formulario canónico guardado en FormData. */
const TEMPLATE_ID_TO_FORM_TYPE = Object.freeze({
  fondos: 'Fondos Registros contables',
  referencia_maestra: 'Fondos Registros contables',
  sfar: 'Fondos Registros contables',
  corporacion: 'Corporación',
  incorporacion: 'Corporación',
  fundaciones: 'Fundaciones',
  fundacion: 'Fundaciones',
  cumplimiento_individual: 'Cumplimiento Individual',
  cumplimiento_entidades: 'Cumplimiento Entidades',
});

const FORM_TYPES = Object.freeze([
  'Cumplimiento Individual',
  'Cumplimiento Entidades',
  'Fondos Registros contables',
  'Corporación',
  'Fundaciones',
]);

function formTypeForTemplateId(templateId) {
  const k = String(templateId || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  return TEMPLATE_ID_TO_FORM_TYPE[k] || null;
}

let resolveCanonical = (t) => t;
try {
  // eslint-disable-next-line global-require
  resolveCanonical = require('../../lib/formWizardRouting.cjs').resolveCanonicalFormType || resolveCanonical;
} catch (_) {
  /* opcional */
}

function canonicalFormType(formType) {
  const c = resolveCanonical(formType);
  return FORM_TYPES.includes(c) ? c : (FORM_TYPES.includes(formType) ? formType : null);
}

// ------------------------------------------------------------------ tabla

let tableReady = null;

async function ensureTable(sequelize) {
  if (!tableReady) {
    tableReady = sequelize
      .query(`
        CREATE TABLE IF NOT EXISTS ${TABLE} (
          "id" UUID PRIMARY KEY,
          "formType" VARCHAR(120) NOT NULL,
          "templateId" VARCHAR(120),
          "version" INTEGER NOT NULL,
          "fileName" VARCHAR(255),
          "fileData" BYTEA NOT NULL,
          "schema" JSONB NOT NULL DEFAULT '{}'::jsonb,
          "fieldCount" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT false,
          "uploadedBy" UUID,
          "activatedAt" TIMESTAMP WITH TIME ZONE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "idx_ftv_form_type" ON ${TABLE} ("formType", "version");
      `)
      .catch((err) => {
        tableReady = null;
        throw err;
      });
  }
  return tableReady;
}

// ------------------------------------------------------------------ motor Python

function runEngine(payload, timeoutMs = 240000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolvePythonCommand(), [ENGINE_SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('El motor de plantillas tardó demasiado'));
    }, timeoutMs);
    proc.stdout.on('data', (c) => { stdout += c.toString(); });
    proc.stderr.on('data', (c) => { stderr += c.toString(); });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    proc.on('close', () => {
      clearTimeout(timer);
      let parsed;
      try {
        parsed = JSON.parse(stdout.trim() || '{}');
      } catch (e) {
        return reject(new Error(`Respuesta inválida del motor: ${(stderr || stdout).slice(-300)}`));
      }
      if (!parsed.ok) return reject(new Error(parsed.error || stderr.slice(-300) || 'Error del motor de plantillas'));
      return resolve(parsed);
    });
    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

function tmpFile(ext) {
  const dir = path.join(os.tmpdir(), 'nexusdoc-template-versions');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`);
}

function safeUnlink(p) {
  try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch (_) { /* nada */ }
}

/** Etiquetas conocidas -> clave del sistema (para conservar claves como firstName, passport, etc.). */
function knownLabelsFor(formType) {
  const out = {};
  const add = (map) => {
    if (!map || typeof map !== 'object') return;
    for (const [key, label] of Object.entries(map)) {
      if (typeof label === 'string' && label.trim()) out[label] = key;
    }
  };
  try {
    if (formType === 'Cumplimiento Individual') {
      const s = require('../../lib/kyciMasterSpec.cjs');
      add(s.FIELD_LABELS_ES); add(s.FIELD_LABELS_EN);
      if (s.FORM_LABELS) { add(s.FORM_LABELS.es); add(s.FORM_LABELS.en); }
    } else if (formType === 'Cumplimiento Entidades') {
      const s = require('../../lib/kyceMasterSpec.cjs');
      if (s.FORM_LABELS) { add(s.FORM_LABELS.es); add(s.FORM_LABELS.en); }
    }
  } catch (_) {
    /* sin etiquetas conocidas */
  }
  return out;
}

async function analyzeBuffer(pdfBuffer, formType) {
  const p = tmpFile('.pdf');
  fs.writeFileSync(p, pdfBuffer);
  try {
    const res = await runEngine({ cmd: 'analyze', pdf_path: p, known_labels: knownLabelsFor(formType) });
    return res.schema;
  } finally {
    safeUnlink(p);
  }
}

async function fillBuffer(pdfBuffer, schema, data, { preview = false } = {}) {
  const input = tmpFile('.pdf');
  const output = tmpFile('.pdf');
  fs.writeFileSync(input, pdfBuffer);
  try {
    await runEngine({ cmd: 'fill', pdf_path: input, schema, data: data || {}, output_path: output, preview });
    return fs.readFileSync(output);
  } finally {
    safeUnlink(input);
    safeUnlink(output);
  }
}

// ------------------------------------------------------------------ consultas

const META_COLS = '"id", "formType", "templateId", "version", "fileName", "fieldCount", "isActive", "uploadedBy", "activatedAt", "createdAt"';

function rowsOf(result) {
  return Array.isArray(result) ? result[0] : result;
}

async function listVersions(sequelize, formType = null) {
  await ensureTable(sequelize);
  const where = formType ? 'WHERE "formType" = :formType' : '';
  const rows = rowsOf(await sequelize.query(
    `SELECT ${META_COLS}, "schema"->'changes' AS "changes", "schema"->'review' AS "review", "schema"->>'source' AS "source"
     FROM ${TABLE} ${where} ORDER BY "formType", "version" DESC`,
    { replacements: { formType } }
  ));
  return rows || [];
}

async function getVersion(sequelize, id, { withFile = false } = {}) {
  await ensureTable(sequelize);
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) return null;
  const cols = `${META_COLS}, "schema"${withFile ? ', "fileData"' : ''}`;
  const rows = rowsOf(await sequelize.query(`SELECT ${cols} FROM ${TABLE} WHERE "id" = :id`, { replacements: { id } }));
  return rows && rows[0] ? rows[0] : null;
}

async function getActiveVersion(sequelize, formType) {
  const canonical = canonicalFormType(formType);
  if (!canonical) return null;
  try {
    await ensureTable(sequelize);
  } catch (err) {
    console.warn('⚠️ FormTemplateVersions no disponible:', err.message);
    return null;
  }
  const rows = rowsOf(await sequelize.query(
    `SELECT ${META_COLS}, "schema" FROM ${TABLE} WHERE "formType" = :formType AND "isActive" = true
     ORDER BY "version" DESC LIMIT 1`,
    { replacements: { formType: canonical } }
  ));
  return rows && rows[0] ? rows[0] : null;
}

async function setActive(sequelize, id) {
  const v = await getVersion(sequelize, id);
  if (!v) return null;
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`UPDATE ${TABLE} SET "isActive" = false, "updatedAt" = NOW() WHERE "formType" = :formType`,
      { replacements: { formType: v.formType }, transaction });
    await sequelize.query(
      `UPDATE ${TABLE} SET "isActive" = true, "activatedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = :id`,
      { replacements: { id }, transaction }
    );
  });
  return getVersion(sequelize, id);
}

/** Vuelve al formulario estándar del sistema (ninguna versión activa). No borra nada. */
async function deactivateAll(sequelize, formType) {
  const canonical = canonicalFormType(formType);
  if (!canonical) return 0;
  await ensureTable(sequelize);
  const res = await sequelize.query(
    `UPDATE ${TABLE} SET "isActive" = false, "updatedAt" = NOW() WHERE "formType" = :formType AND "isActive" = true`,
    { replacements: { formType: canonical } }
  );
  return Array.isArray(res) && res[1] && typeof res[1].rowCount === 'number' ? res[1].rowCount : 0;
}

/**
 * Crea una versión nueva a partir de un PDF subido. Si se detectan campos, queda activa
 * (los trámites nuevos de ese formulario usan esta plantilla). Si no se detecta ningún campo
 * se guarda inactiva para no dejar a los clientes con un formulario vacío.
 */
async function createVersion(sequelize, { templateId, formType, pdfBuffer, fileName, uploadedBy, activate = true }) {
  const canonical = canonicalFormType(formType) || formTypeForTemplateId(templateId);
  if (!canonical) throw new Error('Tipo de formulario no soportado para versiones de plantilla');
  await ensureTable(sequelize);
  const analyzed = await analyzeBuffer(pdfBuffer, canonical);

  // Versiones anteriores (de la más reciente a la más antigua): los campos que ya existían
  // conservan su clave para no perder ni duplicar datos.
  const prevRows = rowsOf(await sequelize.query(
    `SELECT "version", "schema" FROM ${TABLE} WHERE "formType" = :formType ORDER BY "version" DESC LIMIT 25`,
    { replacements: { formType: canonical } }
  )) || [];
  const previous = prevRows
    .map((r) => (r.schema && typeof r.schema === 'object' ? { ...r.schema, __version: r.version } : null))
    .filter((p) => p && p.fields && Object.keys(p.fields).length);
  const { schema, changes } = reconcileSchema(analyzed, previous);
  const fieldCount = Number(schema && schema.fieldCount) || Object.keys(schema.fields || {}).length;
  const version = (Number(prevRows[0] && prevRows[0].version) || 0) + 1;
  const id = crypto.randomUUID();
  // Se activa sola solo si no se pierde nada respecto de la versión anterior. Si se quitan
  // campos o cambia el tipo de alguno, queda PENDIENTE para que el administrador revise.
  const safe = previous.length === 0 || isSafeToAutoActivate(changes);
  // Plantilla escaneada: el OCR puede equivocarse en alguna etiqueta, siempre se revisa antes.
  const scanned = schema && schema.source === 'scanned';
  const willActivate = Boolean(activate) && fieldCount > 0 && safe && !scanned;
  schema.review = {
    pending: fieldCount > 0 && !willActivate,
    reason: !safe ? 'changes' : scanned ? 'scanned' : !activate ? 'manual' : null,
  };

  await sequelize.transaction(async (transaction) => {
    if (willActivate) {
      await sequelize.query(`UPDATE ${TABLE} SET "isActive" = false, "updatedAt" = NOW() WHERE "formType" = :formType`,
        { replacements: { formType: canonical }, transaction });
    }
    await sequelize.query(
      `INSERT INTO ${TABLE} ("id", "formType", "templateId", "version", "fileName", "fileData", "schema", "fieldCount",
         "isActive", "uploadedBy", "activatedAt", "createdAt", "updatedAt")
       VALUES (:id, :formType, :templateId, :version, :fileName, :fileData, CAST(:schema AS JSONB), :fieldCount,
         :isActive, :uploadedBy, ${willActivate ? 'NOW()' : 'NULL'}, NOW(), NOW())`,
      {
        replacements: {
          id,
          formType: canonical,
          templateId: templateId || null,
          version,
          fileName: fileName || null,
          fileData: pdfBuffer,
          schema: JSON.stringify(schema || {}),
          fieldCount,
          isActive: willActivate,
          uploadedBy: uploadedBy || null,
        },
        transaction,
      }
    );
  });
  return { id, formType: canonical, version, fieldCount, isActive: willActivate, schema, changes };
}

/**
 * Vuelve a analizar el PDF de una versión existente (p. ej. después de mejorar el motor) y crea
 * una versión NUEVA, sin activarla: queda pendiente de revisión. No modifica la versión original.
 */
async function reanalyzeVersion(sequelize, id, uploadedBy) {
  const v = await getVersion(sequelize, id, { withFile: true });
  if (!v || !v.fileData) return null;
  return createVersion(sequelize, {
    templateId: v.templateId,
    formType: v.formType,
    pdfBuffer: Buffer.isBuffer(v.fileData) ? v.fileData : Buffer.from(v.fileData),
    fileName: v.fileName,
    uploadedBy,
    activate: false,
  });
}

/**
 * Guarda las correcciones del administrador sobre el esquema (etiquetas, ayudas, obligatorios).
 * - Versión que nunca estuvo activa: se actualiza en el mismo lugar (ningún trámite la usa).
 * - Versión que estuvo activa: se crea una versión NUEVA con las correcciones (pendiente), así los
 *   trámites que ya la usan no cambian.
 */
async function saveSchemaEdits(sequelize, id, editedSchema, userId) {
  const { applySchemaEdits } = require('./templateSchemaEdit');
  const v = await getVersion(sequelize, id, { withFile: true });
  if (!v) return null;
  const next = applySchemaEdits(v.schema, editedSchema);
  if (!next.fieldCount) throw new Error('La plantilla debe tener al menos un campo');
  const inUse = Boolean(v.activatedAt) || Boolean(v.isActive);
  if (!inUse) {
    next.review = { pending: true, reason: 'manual' };
    await sequelize.query(
      `UPDATE ${TABLE} SET "schema" = CAST(:schema AS JSONB), "fieldCount" = :fc, "updatedAt" = NOW() WHERE "id" = :id`,
      { replacements: { id, schema: JSON.stringify(next), fc: next.fieldCount } }
    );
    return { id, version: v.version, inPlace: true, fieldCount: next.fieldCount };
  }
  await ensureTable(sequelize);
  const rows = rowsOf(await sequelize.query(
    `SELECT COALESCE(MAX("version"), 0) AS v FROM ${TABLE} WHERE "formType" = :formType`,
    { replacements: { formType: v.formType } }
  ));
  const version = (Number(rows && rows[0] && rows[0].v) || 0) + 1;
  const newId = crypto.randomUUID();
  next.review = { pending: true, reason: 'manual' };
  next.changes = { ...(v.schema.changes || {}), basedOnVersion: v.version, editedFrom: v.version };
  await sequelize.query(
    `INSERT INTO ${TABLE} ("id", "formType", "templateId", "version", "fileName", "fileData", "schema", "fieldCount",
       "isActive", "uploadedBy", "activatedAt", "createdAt", "updatedAt")
     VALUES (:id, :formType, :templateId, :version, :fileName, :fileData, CAST(:schema AS JSONB), :fc, false, :uploadedBy, NULL, NOW(), NOW())`,
    { replacements: { id: newId, formType: v.formType, templateId: v.templateId, version, fileName: v.fileName,
      fileData: Buffer.isBuffer(v.fileData) ? v.fileData : Buffer.from(v.fileData), schema: JSON.stringify(next),
      fc: next.fieldCount, uploadedBy: userId || null } }
  );
  return { id: newId, version, inPlace: false, fieldCount: next.fieldCount };
}

/** Marca de versión guardada en los datos de un trámite (o null para trámites del formato estándar). */
function versionRefOf(data) {
  const ref = data && typeof data === 'object' ? data.__templateVersion : null;
  if (!ref || typeof ref !== 'object' || !ref.id) return null;
  return ref;
}

async function generatePdfForForm(sequelize, formData) {
  const ref = versionRefOf(formData);
  if (!ref) return null;
  const v = await getVersion(sequelize, ref.id, { withFile: true });
  if (!v || !v.fileData) return null;
  const buf = Buffer.isBuffer(v.fileData) ? v.fileData : Buffer.from(v.fileData);
  return { buffer: await fillBuffer(buf, v.schema, formData), version: v };
}

/**
 * Seguridad al guardar: la marca __templateVersion que envía el navegador solo se acepta si la
 * versión existe y es del mismo formulario. Se reescribe con los datos del servidor.
 */
async function sanitizeVersionRef(sequelize, data, formType) {
  if (!data || typeof data !== 'object' || data.__templateVersion === undefined) return data;
  const ref = versionRefOf(data);
  const out = { ...data };
  delete out.__templateVersion;
  if (!ref) return out;
  let v;
  try {
    v = await getVersion(sequelize, ref.id);
  } catch (err) {
    // Si la base de datos no responde no se toca la marca: nunca se desliga un trámite de su plantilla.
    console.warn('No se pudo validar __templateVersion:', err.message);
    return data;
  }
  const canonical = canonicalFormType(formType);
  if (!v || (canonical && v.formType !== canonical)) return out;
  out.__templateVersion = { id: v.id, version: v.version, formType: v.formType };
  return out;
}

/** Datos públicos del esquema para el formulario del cliente. */
function publicVersion(v) {
  if (!v) return null;
  return {
    id: v.id,
    formType: v.formType,
    version: v.version,
    fieldCount: v.fieldCount,
    isActive: Boolean(v.isActive),
    createdAt: v.createdAt,
    schema: v.schema,
  };
}

module.exports = {
  FORM_TYPES,
  TEMPLATE_ID_TO_FORM_TYPE,
  formTypeForTemplateId,
  canonicalFormType,
  ensureTable,
  runEngine,
  analyzeBuffer,
  fillBuffer,
  listVersions,
  getVersion,
  getActiveVersion,
  setActive,
  deactivateAll,
  createVersion,
  reanalyzeVersion,
  saveSchemaEdits,
  versionRefOf,
  sanitizeVersionRef,
  generatePdfForForm,
  publicVersion,
  knownLabelsFor,
};
