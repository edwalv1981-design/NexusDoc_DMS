'use strict';

/**
 * Excel de la pestaña "Consultas" del administrador.
 * Usa los mismos resultados que el reporte PDF (performAdminSearch):
 *  - Hoja "Resumen": una fila por resultado encontrado.
 *  - Una hoja por tipo de formulario con todos los campos llenados.
 *  - Hoja "Documentos" (si hay documentos del usuario o firmados).
 *  - Hoja "Búsqueda": filtros usados, fecha y quién descargó.
 */

const { buildXlsx } = require('../utils/xlsxWriter');
const kyciMaster = require('../../lib/kyciMasterSpec.cjs');
const kyceMaster = require('../../lib/kyceMasterSpec.cjs');

const SERVER_KEYS = new Set(['__metadata', '__adminEditLog', '__progress']);

// Etiquetas más claras para la hoja de cálculo (grupos de documentos de KYCE).
const EXTRA_LABELS = {
  privateDocs: 'Documentos adjuntos (empresa privada)',
  trustDocs: 'Documentos adjuntos (fideicomiso / fundación)',
  partnershipDocs: 'Documentos adjuntos (sociedad de personas)',
};

const FILTER_LABELS = {
  nombres: 'Nombres',
  ruc: 'RUC / Identificación',
  codigoUnico: 'Código único',
  usuario: 'Usuario',
  empresa: 'Empresa',
  formType: 'Tipo de formulario',
};

function fmtDateTime(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  // Hora local del negocio (el servidor corre en UTC).
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: process.env.REPORT_TIMEZONE || 'America/Guayaquil',
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d).map((x) => [x.type, x.value])
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function fmtValue(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') return v;
  const s = String(v);
  if (/^data:[^;]+;base64,/i.test(s)) return '[archivo/imagen adjunta]';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  return s;
}

/** Etiquetas legibles de KYCI/KYCE (formularios con plantilla oficial). */
function specFor(formType) {
  const t = String(formType || '').toLowerCase();
  if (t.includes('cumplimiento individual') || t === 'kyci') return kyciMaster;
  if (t.includes('cumplimiento entidades') || t === 'kyce') return kyceMaster;
  return null;
}

function optionLabel(spec, key, value) {
  const def = spec?.FIELDS?.[key];
  if (!def?.options || typeof def.options[0] !== 'object') return value;
  const opt = def.options.find((o) => o.key === value);
  return opt ? opt.es : value;
}

/**
 * Aplana los datos del formulario en [{ path, label, value }].
 * Listas de personas → "Directores 1 · fullName"; listas simples → "a, b".
 */
function flattenFormData(data, spec) {
  const out = [];
  const walk = (value, path, label, topKey) => {
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value)) {
      if (value.every((v) => v === null || typeof v !== 'object')) {
        const items = value.filter((v) => v !== null && v !== '').map((v) => optionLabel(spec, topKey, v));
        if (items.length) out.push({ path, label, value: items.join(', ') });
        return;
      }
      value.forEach((item, i) => walk(item, `${path}[${i + 1}]`, `${label} ${i + 1}`, topKey));
      return;
    }
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        if (SERVER_KEYS.has(k)) continue;
        walk(v, path ? `${path}.${k}` : k, label ? `${label} · ${k}` : k, topKey || k);
      }
      return;
    }
    const v = topKey && path === topKey ? optionLabel(spec, topKey, value) : value;
    out.push({ path, label, value: fmtValue(v) });
  };
  for (const [k, v] of Object.entries(data || {})) {
    if (SERVER_KEYS.has(k)) continue;
    const label = EXTRA_LABELS[k] || spec?.FORM_LABELS?.es?.[k] || k;
    walk(v, k, label, k);
  }
  return out;
}

const BASE_COLUMNS = [
  { header: 'ID formulario', width: 38 },
  { header: 'Tipo de formulario', width: 26 },
  { header: 'Usuario', width: 24 },
  { header: 'Correo', width: 28 },
  { header: 'Código único', width: 16 },
  { header: 'Última actualización', width: 18 },
];

function buildAdminSearchXlsx({ results = [], matchingDocuments = [], searchFilters = {}, exportedBy = '' } = {}) {
  const sheets = [];

  // 1) Resumen
  sheets.push({
    name: 'Resumen',
    columns: [
      { header: 'Persona / entidad encontrada', width: 34 },
      { header: 'Pasaporte / ID', width: 18 },
      { header: 'Rol(es)', width: 28 },
      { header: 'Tipo de formulario', width: 26 },
      { header: 'Entidad', width: 30 },
      { header: 'Usuario', width: 24 },
      { header: 'Correo', width: 28 },
      { header: 'Código único', width: 16 },
      { header: 'Última actualización', width: 18 },
      { header: 'ID formulario', width: 38 },
    ],
    rows: results.map((r) => [
      r.personName || '',
      r.personPassport || '',
      r.role || '',
      r.formType || '',
      r.entityName || '',
      r.userName || '',
      r.userEmail || '',
      r.userCode || '',
      fmtDateTime(r.formDate),
      r.formId || '',
    ]),
  });

  // 2) Datos completos: una hoja por tipo de formulario
  const forms = new Map();
  for (const r of results) if (r.formId && !forms.has(r.formId)) forms.set(r.formId, r);
  const byType = new Map();
  for (const r of forms.values()) {
    const key = r.formType || 'Formulario';
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key).push(r);
  }
  for (const [formType, list] of byType) {
    const spec = specFor(formType);
    const flat = list.map((r) => flattenFormData(r.formData || {}, spec));
    const order = [];
    const labels = new Map();
    flat.forEach((fields) => fields.forEach((f) => {
      if (!labels.has(f.path)) { labels.set(f.path, f.label); order.push(f.path); }
    }));
    sheets.push({
      name: `Datos - ${formType}`,
      columns: [...BASE_COLUMNS, ...order.map((p) => ({ header: labels.get(p), width: Math.min(45, Math.max(14, String(labels.get(p)).length + 2)) }))],
      rows: list.map((r, i) => {
        const values = new Map(flat[i].map((f) => [f.path, f.value]));
        return [r.formId || '', r.formType || '', r.userName || '', r.userEmail || '', r.userCode || '', fmtDateTime(r.formDate), ...order.map((p) => values.get(p) ?? '')];
      }),
    });
  }

  // 3) Documentos
  if (matchingDocuments.length) {
    sheets.push({
      name: 'Documentos',
      columns: [
        { header: 'Archivo', width: 36 },
        { header: 'Tipo', width: 18 },
        { header: 'Estado de firma', width: 30 },
        { header: 'Usuario', width: 24 },
        { header: 'Correo', width: 28 },
        { header: 'Código único', width: 16 },
        { header: 'Fecha', width: 18 },
      ],
      rows: matchingDocuments.map((d) => [
        d.filename || '',
        d.type === 'SignedDocument' ? 'Documento firmado' : 'Adjunto del usuario',
        d.signatureStatus || '',
        d.userName || '',
        d.userEmail || '',
        d.userCode || '',
        fmtDateTime(d.createdAt),
      ]),
    });
  }

  // 4) Búsqueda
  const filterRows = Object.entries(FILTER_LABELS)
    .filter(([k]) => String(searchFilters[k] || '').trim())
    .map(([k, label]) => [label, String(searchFilters[k]).trim()]);
  sheets.push({
    name: 'Búsqueda',
    columns: [{ header: 'Dato', width: 26 }, { header: 'Valor', width: 50 }],
    rows: [
      ...filterRows,
      ['Resultados', results.length],
      ['Formularios distintos', forms.size],
      ['Documentos', matchingDocuments.length],
      ['Generado', fmtDateTime(new Date())],
      ['Descargado por', exportedBy || ''],
    ],
  });

  return buildXlsx(sheets);
}

module.exports = { buildAdminSearchXlsx, flattenFormData };
