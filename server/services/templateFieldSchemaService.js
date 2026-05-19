'use strict';

const fs = require('fs');
const path = require('path');
const pdfFormSchemas = require('../config/pdfFormSchemas');
const stablePdfForms = require('../config/stablePdfForms');
const { extractAcroFieldsFromBuffer } = require('../utils/pdfFieldExtraction');

const CACHE_DIR = path.join(__dirname, '../data/template-fields');

const TEMPLATE_ID_BY_ADMIN_NAME = Object.freeze({
  fondos: 'fondos',
  referencia_maestra: 'fondos',
  corporacion: 'corporacion',
  fundaciones: 'fundaciones',
  cumplimiento_individual: 'cumplimiento_individual',
  cumplimiento_entidades: 'cumplimiento_entidades',
});

const FORM_TYPE_BY_TEMPLATE = Object.freeze({
  fondos: stablePdfForms.FORM_TYPE_FONDOS_SFAR,
  cumplimiento_individual: 'Cumplimiento Individual',
  cumplimiento_entidades: 'Cumplimiento Entidades',
});

const STEP_GROUPS = Object.freeze([
  { id: 'personal', titleKey: 'steps.personal', pattern: /first|second|last|surname|apellido|birth|marital|national|passport|cedula|identification|nombre/i },
  { id: 'contact', titleKey: 'steps.contact', pattern: /phone|telefono|email|correo|address|direccion|domicilio|city|ciudad|country|pais|occupation|ocupacion|employer|empleador/i },
  { id: 'compliance', titleKey: 'steps.compliance', pattern: /pep|funds|fondo|source|declaration|declaracion|checkbox|check/i },
]);

function normalizeKey(text) {
  return String(text || '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

function acroNameToFormKey(acroName) {
  const raw = String(acroName || '').trim();
  if (!raw) return '';
  if (/^[a-z][a-zA-Z0-9]*$/.test(raw) && !raw.includes('_')) return raw;
  const camelSplit = raw.replace(/([a-z])([A-Z])/g, '$1 $2');
  const parts = camelSplit.split(/[._\-\s/]+/).filter(Boolean);
  if (!parts.length) return normalizeKey(raw);
  return parts
    .map((p, i) => {
      const lower = p.toLowerCase();
      if (i === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function inferFieldType(formKey, acroMeta, staticField) {
  if (staticField?.type) return staticField.type;
  const acroType = String(acroMeta?.type || '').toLowerCase();
  const key = String(formKey || '').toLowerCase();

  if (acroType.includes('checkbox') || acroType.includes('radio')) {
    if (/funds|source|origen/i.test(key)) return 'checkboxGroup';
    return 'radio';
  }
  if (acroType.includes('button')) return 'text';
  if (/date|fecha|birth/i.test(key)) return 'date';
  if (/email|correo/i.test(key)) return 'email';
  if (/pepdetail|detail|observ|comment|nota/i.test(key)) return 'textarea';
  if (/pep$/i.test(key) || /^pep[^a-z]/i.test(key)) return 'select';
  if (/funds|source/i.test(key) && !/other|otro/i.test(key)) return 'checkboxGroup';
  return 'text';
}

function findStaticFieldDef(staticSchema, formKey) {
  if (!staticSchema) return null;
  for (const step of staticSchema.steps) {
    for (const field of step.fields) {
      if (field.key === formKey) return field;
    }
  }
  return null;
}

function assignStepId(formKey) {
  for (const group of STEP_GROUPS) {
    if (group.pattern.test(formKey)) return group.id;
  }
  return 'other';
}

function buildFieldMapping(acroFields, staticSchema) {
  const mapping = {};
  const staticKeys = staticSchema ? pdfFormSchemas.listSchemaFieldKeys(staticSchema) : [];
  const acroNames = acroFields.map((f) => f.name);

  const acroByNorm = new Map();
  for (const name of acroNames) {
    acroByNorm.set(name.toLowerCase(), name);
    acroByNorm.set(acroNameToFormKey(name).toLowerCase(), name);
  }

  for (const formKey of staticKeys) {
    if (acroByNorm.has(formKey.toLowerCase())) {
      mapping[formKey] = acroByNorm.get(formKey.toLowerCase());
      continue;
    }
    const camel = formKey.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (acroByNorm.has(camel)) {
      mapping[formKey] = acroByNorm.get(camel);
    }
  }

  for (const acro of acroFields) {
    const formKey = acroNameToFormKey(acro.name);
    if (!mapping[formKey]) {
      mapping[formKey] = acro.name;
    }
  }

  return mapping;
}

function buildDynamicSchema(templateId, acroFields, staticSchema) {
  const i18nPrefix = staticSchema?.i18nPrefix || 'kyci';
  const stepsMap = new Map();

  for (const group of STEP_GROUPS) {
    stepsMap.set(group.id, { id: group.id, titleKey: group.titleKey, fields: [] });
  }
  stepsMap.set('other', { id: 'other', titleKey: 'steps.other', fields: [] });

  const seenKeys = new Set();

  for (const acro of acroFields) {
    const formKey = acroNameToFormKey(acro.name);
    if (!formKey || seenKeys.has(formKey)) continue;
    seenKeys.add(formKey);

    const staticField = findStaticFieldDef(staticSchema, formKey);
    const stepId = staticField
      ? staticSchema.steps.find((s) => s.fields.some((f) => f.key === formKey))?.id || assignStepId(formKey)
      : assignStepId(formKey);

    if (!stepsMap.has(stepId)) {
      stepsMap.set(stepId, { id: stepId, titleKey: `steps.${stepId}`, fields: [] });
    }

    const field = {
      key: formKey,
      type: inferFieldType(formKey, acro, staticField),
      col: staticField?.col || 'half',
      required: staticField?.required ?? false,
      acroName: acro.name,
    };

    if (staticField?.options) field.options = staticField.options;
    if (staticField?.showIf) field.showIf = staticField.showIf;
    if (field.type === 'checkboxGroup' && staticField?.options) {
      field.options = staticField.options;
    } else if (field.type === 'checkboxGroup' && !field.options) {
      field.type = 'text';
    }
    if (field.type === 'select' && !field.options) {
      field.options = ['No', 'Sí'];
    }

    stepsMap.get(stepId).fields.push(field);
  }

  const steps = [...stepsMap.values()].filter((s) => s.fields.length > 0);
  if (!steps.length && staticSchema) {
    return staticSchema;
  }

  return {
    templateId: templateId || staticSchema?.templateId,
    formType: staticSchema?.formType,
    i18nPrefix,
    steps,
  };
}

function mergeSchemas(staticSchema, uploadedSchema, acroCount) {
  if (!staticSchema) return { schema: uploadedSchema, schemaSource: 'uploaded' };
  if (!uploadedSchema || acroCount === 0) {
    return { schema: staticSchema, schemaSource: 'static' };
  }

  const staticKeys = new Set(pdfFormSchemas.listSchemaFieldKeys(staticSchema));
  const uploadedKeys = new Set(pdfFormSchemas.listSchemaFieldKeys(uploadedSchema));
  const sameKeys =
    staticKeys.size === uploadedKeys.size &&
    [...staticKeys].every((k) => uploadedKeys.has(k));

  if (sameKeys) {
    return { schema: uploadedSchema, schemaSource: 'uploaded' };
  }

  return { schema: uploadedSchema, schemaSource: 'merged' };
}

function writeJsonCache(templateName, payload) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    const filePath = path.join(CACHE_DIR, `${templateName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️ No se pudo escribir caché de campos PDF:', err.message);
  }
}

function readJsonCache(templateName) {
  try {
    const filePath = path.join(CACHE_DIR, `${templateName}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function resolveTemplateName(adminOrInternalName) {
  const norm = String(adminOrInternalName || '').toLowerCase();
  if (norm === 'referencia_maestra') return 'fondos';
  return TEMPLATE_ID_BY_ADMIN_NAME[norm] || norm;
}

function isPdfTemplateName(templateName) {
  const norm = resolveTemplateName(templateName);
  return norm !== 'corporacion' && norm !== 'fundaciones';
}

/**
 * @param {import('../models/TemplateFieldSchema')} TemplateFieldSchemaModel
 */
async function persistExtraction(TemplateFieldSchemaModel, templateName, pdfBuffer, formType) {
  const resolved = resolveTemplateName(templateName);
  const staticSchema =
    pdfFormSchemas.getSchemaByTemplateId(resolved) ||
    pdfFormSchemas.getSchemaByFormType(formType || FORM_TYPE_BY_TEMPLATE[resolved]);

  let acroFields = [];
  let extractError = null;

  if (isPdfTemplateName(resolved)) {
    try {
      const result = await extractAcroFieldsFromBuffer(pdfBuffer);
      acroFields = result.fields || [];
    } catch (err) {
      extractError = err.message;
      console.warn(`⚠️ Extracción AcroForm falló (${resolved}):`, err.message);
    }
  }

  const fieldMapping = buildFieldMapping(acroFields, staticSchema);
  const dynamicSchema = acroFields.length
    ? buildDynamicSchema(resolved, acroFields, staticSchema)
    : staticSchema;
  const { schemaSource } = mergeSchemas(staticSchema, dynamicSchema, acroFields.length);

  const row = {
    templateName: resolved,
    formType: formType || FORM_TYPE_BY_TEMPLATE[resolved] || null,
    acroFields,
    fieldMapping,
    schemaSource: acroFields.length ? schemaSource : 'static',
    extractedAt: new Date(),
  };

  const existing = await TemplateFieldSchemaModel.findOne({ where: { templateName: resolved } });
  if (existing) {
    await existing.update(row);
  } else {
    await TemplateFieldSchemaModel.create(row);
  }

  writeJsonCache(resolved, {
    ...row,
    extractedAt: row.extractedAt.toISOString(),
    extractError,
  });

  return {
    templateName: resolved,
    fieldCount: acroFields.length,
    fieldNames: acroFields.map((f) => f.name),
    schemaSource: row.schemaSource,
    flatPdf: acroFields.length === 0,
    extractError,
    fieldMapping,
  };
}

/**
 * @param {import('../models/TemplateFieldSchema')} TemplateFieldSchemaModel
 */
async function getStoredRecord(TemplateFieldSchemaModel, formType) {
  const templateName = stablePdfForms.getPdfTemplateNameForForm(formType);
  const resolved = resolveTemplateName(templateName);

  let record = await TemplateFieldSchemaModel.findOne({ where: { templateName: resolved } });
  if (!record) {
    const cache = readJsonCache(resolved);
    if (cache) return cache;
    return null;
  }
  return record.toJSON ? record.toJSON() : record;
}

/**
 * @param {import('../models/TemplateFieldSchema')} TemplateFieldSchemaModel
 */
async function getMergedSchemaResponse(TemplateFieldSchemaModel, formType) {
  const staticSchema = pdfFormSchemas.getSchemaByFormType(formType);
  const templateName = stablePdfForms.getPdfTemplateNameForForm(formType);
  const stored = await getStoredRecord(TemplateFieldSchemaModel, formType);

  const acroFields = stored?.acroFields || [];
  const uploadedSchema =
    acroFields.length > 0
      ? buildDynamicSchema(resolveTemplateName(templateName), acroFields, staticSchema)
      : null;

  const { schema, schemaSource } = mergeSchemas(staticSchema, uploadedSchema, acroFields.length);
  if (!schema) {
    return null;
  }

  return {
    schema,
    schemaSource,
    emptyState: pdfFormSchemas.emptyStateForSchema(schema),
    templateId: schema.templateId,
    acroFieldCount: acroFields.length,
    acroFieldNames: acroFields.map((f) => f.name),
    staticFieldCount: staticSchema ? pdfFormSchemas.listSchemaFieldKeys(staticSchema).length : 0,
    fieldMapping: stored?.fieldMapping || {},
    warnings: acroFields.length === 0 && staticSchema ? ['flat_pdf_or_anchor_only'] : [],
  };
}

/**
 * @param {import('../models/TemplateFieldSchema')} TemplateFieldSchemaModel
 */
async function getFieldMappingForPdf(TemplateFieldSchemaModel, formType) {
  const stored = await getStoredRecord(TemplateFieldSchemaModel, formType);
  return stored?.fieldMapping || {};
}

async function deleteSchemaForTemplate(TemplateFieldSchemaModel, templateName) {
  const resolved = resolveTemplateName(templateName);
  await TemplateFieldSchemaModel.destroy({ where: { templateName: resolved } });
  try {
    const cachePath = path.join(CACHE_DIR, `${resolved}.json`);
    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
  } catch {
    /* ignore */
  }
}

module.exports = {
  CACHE_DIR,
  resolveTemplateName,
  isPdfTemplateName,
  acroNameToFormKey,
  inferFieldType,
  buildFieldMapping,
  buildDynamicSchema,
  mergeSchemas,
  persistExtraction,
  getMergedSchemaResponse,
  getFieldMappingForPdf,
  deleteSchemaForTemplate,
};
