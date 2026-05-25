'use strict';

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const pdfFormSchemas = require('../config/pdfFormSchemas');
const stablePdfForms = require('../config/stablePdfForms');
const templateAvailability = require('../utils/templateAvailability');
const { extractAcroFieldsFromBuffer, extractAcroFieldsFromPath } = require('../utils/pdfFieldExtraction');
const { resolveCanonicalFormType } = require('../../lib/formWizardRouting.cjs');

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

const { FIELD_LABELS_ES: KYCI_FIELD_LABELS_ES } = require('../../lib/kyciMasterSpec.cjs');

/** Etiquetas humanas KYCE (es) alineadas con client i18n. */
const KYCE_FIELD_LABELS_ES = Object.freeze({
  legalName: 'RAZÓN SOCIAL',
  tradeName: 'NOMBRE COMERCIAL',
  entityType: 'TIPO DE ENTIDAD',
  incorporationDate: 'FECHA DE CONSTITUCIÓN',
  jurisdiction: 'JURISDICCIÓN',
  taxId: 'RUC / NIT / ID FISCAL',
  registrationNumber: 'NÚMERO DE REGISTRO',
  registeredAddress: 'DOMICILIO SOCIAL',
  phone: 'TELÉFONO',
  email: 'CORREO ELECTRÓNICO',
  city: 'CIUDAD',
  country: 'PAÍS DE OPERACIÓN',
  businessActivity: 'OBJETO SOCIAL / ACTIVIDAD',
  website: 'SITIO WEB',
  legalRepName: 'REPRESENTANTE LEGAL — NOMBRE',
  legalRepId: 'REPRESENTANTE LEGAL — DOCUMENTO',
  legalRepNationality: 'REPRESENTANTE LEGAL — NACIONALIDAD',
  beneficialOwners: 'BENEFICIARIOS FINALES',
  pep: 'PEP (PERSONA O ENTIDAD EXPUESTA)',
  pepDetails: 'DETALLE PEP (si aplica)',
  fundsSource: 'ORIGEN DE FONDOS / PATRIMONIO',
  fundsOther: 'OTRAS FUENTES (ESPECIFIQUE)',
  declarationName: 'NOMBRE EN DECLARACIÓN',
  declarationDate: 'FECHA DE DECLARACIÓN',
});

let templatesConfigCache = null;

function loadTemplatesConfig() {
  if (templatesConfigCache) return templatesConfigCache;
  try {
    const configPath = path.join(__dirname, '../../templates/templates_config.json');
    templatesConfigCache = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    templatesConfigCache = {};
  }
  return templatesConfigCache;
}

function buildLabelMapFromTemplatesConfig(templateId) {
  const config = loadTemplatesConfig();
  const section = config[templateId];
  if (!section?.anchors) return {};
  const map = {};
  for (const anchor of section.anchors) {
    if (anchor.data_key) {
      map[anchor.data_key] = anchor.label || titleCaseFromKey(anchor.data_key);
    }
  }
  return map;
}

function titleCaseFromKey(key) {
  return String(key || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_\-.]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function humanizeAcroName(acroName) {
  const raw = String(acroName || '').trim();
  if (!raw) return '';
  const stripped = raw
    .replace(/^(txt|fld|field|cb|chk)[_\-.]*/i, '')
    .replace(/[_\-.]+/g, ' ')
    .trim();
  return stripped
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function resolveFieldLabel(formKey, acroName, staticField, labelMap) {
  if (labelMap?.[formKey]) return labelMap[formKey];
  if (labelMap?.[acroName]) return labelMap[acroName];
  if (KYCI_FIELD_LABELS_ES[formKey]) return KYCI_FIELD_LABELS_ES[formKey];
  if (KYCE_FIELD_LABELS_ES[formKey]) return KYCE_FIELD_LABELS_ES[formKey];
  if (staticField?.label) return staticField.label;
  const fromAcro = humanizeAcroName(acroName);
  if (fromAcro) return fromAcro;
  return titleCaseFromKey(formKey);
}

const STEP_GROUPS = Object.freeze([
  {
    id: 'entity',
    titleKey: 'steps.entity',
    pattern:
      /legal|trade|entity|incorporation|jurisdiction|tax|registration|registered|razon|entidad|constitucion|fiscal|domicilio/i,
  },
  {
    id: 'personal',
    titleKey: 'steps.personal',
    pattern: /first|second|last|surname|apellido|birth|marital|national|passport|cedula|identification|nombre/i,
  },
  {
    id: 'contact',
    titleKey: 'steps.contact',
    pattern:
      /phone|telefono|email|correo|address|direccion|domicilio|city|ciudad|country|pais|occupation|ocupacion|employer|empleador|website|web|business|actividad|objeto/i,
  },
  {
    id: 'compliance',
    titleKey: 'steps.compliance',
    pattern:
      /pep|funds|fondo|source|declaration|declaracion|checkbox|check|legalrep|beneficial|representante|beneficiario/i,
  },
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

function buildDynamicSchema(templateId, acroFields, staticSchema, labelMap = null) {
  const i18nPrefix = staticSchema?.i18nPrefix || 'kyci';
  const labels = labelMap || buildLabelMapFromTemplatesConfig(templateId);
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
      label: resolveFieldLabel(formKey, acro.name, staticField, labels),
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
  if (!steps.length) {
    return null;
  }

  return {
    templateId: templateId || staticSchema?.templateId,
    formType: staticSchema?.formType,
    i18nPrefix,
    steps,
  };
}

function buildFlatPdfNoticeSchema(staticSchema) {
  const base = staticSchema || {
    templateId: 'cumplimiento_individual',
    formType: 'Cumplimiento Individual',
    i18nPrefix: 'kyci',
  };
  return {
    templateId: base.templateId,
    formType: base.formType,
    i18nPrefix: base.i18nPrefix || 'kyci',
    flatPdf: true,
    steps: [],
  };
}

/**
 * @param {boolean} templateAvailable Hay plantilla en disco o BD (no usar esquema KYCI estático).
 */
function mergeSchemas(staticSchema, uploadedSchema, acroCount, templateAvailable = false) {
  if (!staticSchema) {
    return {
      schema: uploadedSchema,
      schemaSource: uploadedSchema ? 'uploaded' : 'static',
      flatPdf: false,
    };
  }

  if (acroCount > 0 && uploadedSchema) {
    const staticKeys = new Set(pdfFormSchemas.listSchemaFieldKeys(staticSchema));
    const uploadedKeys = new Set(pdfFormSchemas.listSchemaFieldKeys(uploadedSchema));
    const sameKeys =
      staticKeys.size === uploadedKeys.size &&
      [...staticKeys].every((k) => uploadedKeys.has(k));

    return {
      schema: uploadedSchema,
      schemaSource: sameKeys ? 'uploaded' : 'uploaded_pdf',
      flatPdf: false,
    };
  }

  if (templateAvailable) {
    return {
      schema: buildFlatPdfNoticeSchema(staticSchema),
      schemaSource: 'flat_pdf',
      flatPdf: true,
    };
  }

  if (!uploadedSchema || acroCount === 0) {
    return { schema: staticSchema, schemaSource: 'static', flatPdf: false };
  }

  return {
    schema: uploadedSchema,
    schemaSource: 'uploaded_pdf',
    flatPdf: false,
  };
}

const PDF_PREFIX_BY_TEMPLATE = Object.freeze({
  fondos: 'SFAR',
  cumplimiento_individual: 'KYCI',
  cumplimiento_entidades: 'KYCE',
});

function getDeployedPdfPath(templateName) {
  const resolved = resolveTemplateName(templateName);
  const prefix = PDF_PREFIX_BY_TEMPLATE[resolved];
  if (!prefix) return null;
  const templatesDir = path.join(__dirname, '../templates');
  const primary = path.join(templatesDir, `${prefix}.pdf`);
  if (fs.existsSync(primary)) return primary;
  if (prefix === 'SFAR') {
    const legacy = path.join(__dirname, '../../templates/referencia_maestra.pdf');
    if (fs.existsSync(legacy)) return legacy;
  }
  return null;
}

function normalizeTemplateId(adminOrInternalName) {
  return String(adminOrInternalName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * @param {import('../models/DocumentTemplate')|null} DocumentTemplateModel
 * @returns {Promise<{ buffer: Buffer, source: 'disk'|'db', path?: string|null }|null>}
 */
async function resolveTemplatePdf(DocumentTemplateModel, templateName) {
  const resolved = resolveTemplateName(templateName);
  const diskPath = getDeployedPdfPath(resolved);
  if (diskPath && fs.existsSync(diskPath)) {
    return { buffer: fs.readFileSync(diskPath), source: 'disk', path: diskPath };
  }

  if (!DocumentTemplateModel) return null;

  const formTypeLabel = FORM_TYPE_BY_TEMPLATE[resolved];
  const lookup = templateAvailability.resolveTemplateLookup(formTypeLabel || resolved);
  const dbNames = lookup?.dbNames?.length ? lookup.dbNames : [resolved];

  const row = await DocumentTemplateModel.findOne({
    where: { name: { [Op.in]: dbNames } },
  });
  if (!row?.fileData) return null;

  const buffer = Buffer.isBuffer(row.fileData) ? row.fileData : Buffer.from(row.fileData);
  return { buffer, source: 'db', path: null };
}

/**
 * @param {import('../models/DocumentTemplate')|null} DocumentTemplateModel
 */
async function templateExistsForForm(DocumentTemplateModel, templateName) {
  const pdf = await resolveTemplatePdf(DocumentTemplateModel, templateName);
  return Boolean(pdf?.buffer?.length);
}

/**
 * @param {import('../models/DocumentTemplate')|null} DocumentTemplateModel
 */
async function refreshAcroFieldsFromTemplate(templateName, DocumentTemplateModel) {
  const pdf = await resolveTemplatePdf(DocumentTemplateModel, templateName);
  if (!pdf?.buffer?.length) {
    return { fields: [], templateExists: false, pdfSource: null, pdfBuffer: null, extractError: null };
  }

  try {
    const result = await extractAcroFieldsFromBuffer(pdf.buffer);
    return {
      fields: result.fields || [],
      templateExists: true,
      pdfSource: pdf.source,
      pdfBuffer: pdf.buffer,
      extractError: null,
    };
  } catch (err) {
    console.warn(`⚠️ Re-extracción AcroForm (${templateName}):`, err.message);
    return {
      fields: [],
      templateExists: true,
      pdfSource: pdf.source,
      pdfBuffer: pdf.buffer,
      extractError: err.message,
    };
  }
}

/** @deprecated Usar refreshAcroFieldsFromTemplate */
async function refreshAcroFieldsFromDeployedPdf(templateName) {
  const { fields } = await refreshAcroFieldsFromTemplate(templateName, null);
  return fields;
}

function syncTemplatePdfToDisk(templateName, pdfBuffer) {
  const resolved = resolveTemplateName(templateName);
  const diskPath = getDeployedPdfPath(resolved);
  if (!diskPath || !pdfBuffer?.length) return;
  try {
    const dir = path.dirname(diskPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(diskPath, pdfBuffer);
  } catch (err) {
    console.warn(`⚠️ No se pudo sincronizar PDF a disco (${resolved}):`, err.message);
  }
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
  const norm = normalizeTemplateId(adminOrInternalName);
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

  syncTemplatePdfToDisk(resolved, pdfBuffer);

  const fieldMapping = buildFieldMapping(acroFields, staticSchema);
  const dynamicSchema = acroFields.length
    ? buildDynamicSchema(resolved, acroFields, staticSchema)
    : null;
  const templateAvailable = Boolean(pdfBuffer?.length);
  const { schemaSource } = mergeSchemas(staticSchema, dynamicSchema, acroFields.length, templateAvailable);

  const row = {
    templateName: resolved,
    formType: formType || FORM_TYPE_BY_TEMPLATE[resolved] || null,
    acroFields,
    fieldMapping,
    schemaSource: acroFields.length ? schemaSource : templateAvailable ? 'flat_pdf' : 'static',
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
  const canonical = resolveCanonicalFormType(formType);
  const templateName = stablePdfForms.getPdfTemplateNameForForm(canonical);
  if (!templateName) return null;
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
async function getMergedSchemaResponse(
  TemplateFieldSchemaModel,
  formType,
  DocumentTemplateModel = null
) {
  const canonicalFormType = resolveCanonicalFormType(formType);
  const staticSchema =
    pdfFormSchemas.getSchemaByFormType(canonicalFormType) ||
    pdfFormSchemas.getSchemaByFormType(formType);
  const templateName = stablePdfForms.getPdfTemplateNameForForm(canonicalFormType);
  if (!templateName) {
    return null;
  }
  const resolvedTemplate = resolveTemplateName(templateName);

  // ENFORCE ADMIN TEMPLATE FOR KYCI AND KYCE
  const isKyciOrKyce = stablePdfForms.isKyciHtmlForm(canonicalFormType) || stablePdfForms.isKyceHtmlForm(canonicalFormType);
  if (isKyciOrKyce) {
    const dbTemplate = DocumentTemplateModel ? await DocumentTemplateModel.findOne({ where: { name: resolvedTemplate } }) : null;
    const adminUploaded = dbTemplate && dbTemplate.uploadedBy;
    
    if (!adminUploaded) {
      return {
        schema: null,
        schemaSource: 'none',
        flatPdf: true, // Forces the UI to show the blocker message
        formType: canonicalFormType,
        emptyState: {},
        templateId: resolvedTemplate,
        acroFieldCount: 0,
        acroFieldNames: [],
        acroSource: 'none',
        templateAvailable: false,
        extractError: null,
        staticFieldCount: 0,
        dynamicFieldCount: 0,
        usesStaticFallback: false,
        fieldMapping: {},
        message: 'Para poder generar el formulario, la plantilla debe estar subida y configurada previamente desde el panel de Administrador.',
        warnings: ['admin_template_required']
      };
    }
  }

  const stored = await getStoredRecord(TemplateFieldSchemaModel, canonicalFormType);

  let acroFields = Array.isArray(stored?.acroFields) ? stored.acroFields : [];
  let acroSource = acroFields.length ? 'db' : 'none';
  let extractError = null;
  const templateAvailable = await templateExistsForForm(DocumentTemplateModel, resolvedTemplate);

  if (!acroFields.length && templateAvailable) {
    const refresh = await refreshAcroFieldsFromTemplate(resolvedTemplate, DocumentTemplateModel);
    acroFields = refresh.fields;
    extractError = refresh.extractError;
    acroSource = acroFields.length ? refresh.pdfSource || 'none' : refresh.pdfSource || 'none';
    if (acroFields.length && TemplateFieldSchemaModel && refresh.pdfBuffer) {
      try {
        await persistExtraction(
          TemplateFieldSchemaModel,
          resolvedTemplate,
          refresh.pdfBuffer,
          canonicalFormType
        );
        acroSource = refresh.pdfSource || acroSource;
      } catch (persistErr) {
        console.warn('⚠️ No se pudo persistir esquema tras re-extracción:', persistErr.message);
      }
    }
  }

  const labelMap = buildLabelMapFromTemplatesConfig(resolvedTemplate);
  const uploadedSchema =
    acroFields.length > 0
      ? buildDynamicSchema(resolvedTemplate, acroFields, staticSchema, labelMap)
      : null;

  const { schema, schemaSource, flatPdf } = mergeSchemas(
    staticSchema,
    uploadedSchema,
    acroFields.length,
    templateAvailable
  );
  if (!schema) {
    return null;
  }

  const dynamicKeys = pdfFormSchemas.listSchemaFieldKeys(schema);
  const staticKeys = staticSchema ? pdfFormSchemas.listSchemaFieldKeys(staticSchema) : [];

  return {
    schema,
    schemaSource,
    flatPdf: Boolean(flatPdf),
    formType: canonicalFormType,
    emptyState: flatPdf ? {} : pdfFormSchemas.emptyStateForSchema(schema),
    templateId: schema.templateId,
    acroFieldCount: acroFields.length,
    acroFieldNames: acroFields.map((f) => f.name),
    acroSource,
    templateAvailable,
    extractError,
    staticFieldCount: staticKeys.length,
    dynamicFieldCount: dynamicKeys.length,
    usesStaticFallback: schemaSource === 'static',
    fieldMapping: stored?.fieldMapping || {},
    message:
      flatPdf || (templateAvailable && acroFields.length === 0)
        ? 'PDF sin campos rellenables (AcroForm). Suba una plantilla con campos de formulario o contacte al administrador.'
        : null,
    warnings:
      templateAvailable && acroFields.length === 0
        ? ['flat_pdf_no_acroform']
        : [],
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
  KYCI_FIELD_LABELS_ES,
  resolveTemplateName,
  normalizeTemplateId,
  isPdfTemplateName,
  acroNameToFormKey,
  humanizeAcroName,
  resolveFieldLabel,
  buildLabelMapFromTemplatesConfig,
  inferFieldType,
  buildFieldMapping,
  buildDynamicSchema,
  buildFlatPdfNoticeSchema,
  mergeSchemas,
  getDeployedPdfPath,
  resolveTemplatePdf,
  templateExistsForForm,
  refreshAcroFieldsFromTemplate,
  refreshAcroFieldsFromDeployedPdf,
  syncTemplatePdfToDisk,
  persistExtraction,
  getMergedSchemaResponse,
  getFieldMappingForPdf,
  deleteSchemaForTemplate,
};
