'use strict';

/**
 * Esquemas de captura alineados con plantillas PDF (KYCI / KYCE).
 * Claves `data_key` deben coincidir con `templates_config.json` y el estado del formulario cliente.
 */

const {
  MARITAL_STATUS_OPTIONS: MARITAL_OPTIONS,
  FUNDS_SOURCE_OPTIONS,
} = require('../../lib/kyciMasterSpec.cjs');

const kyciMasterSpec = require('../../lib/kyciMasterSpec.cjs');

const KYCI_FULL_WIDTH = new Set(['panamaEntityName', 'applicantRoles', 'address', 'sourceOfWealth', 'certifiedDocs']);

/** KYCI: pasos y campos derivados de la plantilla oficial (lib/kyciMasterSpec.cjs). */
const CUMPLIMIENTO_INDIVIDUAL_SCHEMA = Object.freeze({
  templateId: 'cumplimiento_individual',
  formType: 'Cumplimiento Individual',
  i18nPrefix: 'kyci',
  steps: Object.freeze(
    kyciMasterSpec.SECTIONS.map((section) => ({
      id: section.stepId,
      titleKey: `steps.${section.stepId}`,
      fields: Object.freeze(
        section.fieldKeys.map((key) => {
          const def = kyciMasterSpec.FIELDS[key];
          const field = { key, type: def.type, col: KYCI_FULL_WIDTH.has(key) || def.type === 'textarea' || def.type === 'radio' ? 'full' : 'half' };
          if (def.required) field.required = true;
          if (def.options) field.options = def.options;
          if (def.showIf) field.showIf = def.showIf;
          if (def.requiredIf) field.requiredIf = def.requiredIf;
          return field;
        })
      ),
    }))
  ),
});

const KYCE_FUNDS_SOURCE_OPTIONS = Object.freeze([
  { key: 'Bienes de la entidad', labelKey: 'bienes' },
  { key: 'Inversiones Financieras', labelKey: 'inversiones' },
  { key: 'Ingresos por negocios', labelKey: 'negocios' },
  { key: 'Préstamos / créditos', labelKey: 'prestamos' },
  { key: 'Aportes de socios / capital', labelKey: 'capital' },
]);

const kyceMasterSpec = require('../../lib/kyceMasterSpec.cjs');

/** KYCE: pasos y campos derivados de la plantilla oficial (lib/kyceMasterSpec.cjs). */
const CUMPLIMIENTO_ENTIDADES_SCHEMA = Object.freeze({
  templateId: 'cumplimiento_entidades',
  formType: 'Cumplimiento Entidades',
  i18nPrefix: 'kyce',
  steps: Object.freeze(
    kyceMasterSpec.SECTIONS.map((section) => ({
      id: section.stepId,
      titleKey: `steps.${section.stepId}`,
      fields: Object.freeze(
        section.fieldKeys.map((key) => {
          const def = kyceMasterSpec.FIELDS[key];
          const field = { key, type: def.type, col: ['textarea', 'radio', 'checkboxGroup'].includes(def.type) ? 'full' : 'half' };
          if (def.required) field.required = true;
          if (def.options) field.options = def.options;
          if (def.showIf) field.showIf = def.showIf;
          return field;
        })
      ),
    }))
  ),
});

const SCHEMA_BY_TEMPLATE_ID = Object.freeze({
  cumplimiento_individual: CUMPLIMIENTO_INDIVIDUAL_SCHEMA,
  cumplimiento_entidades: CUMPLIMIENTO_ENTIDADES_SCHEMA,
});

const SCHEMA_BY_FORM_TYPE = Object.freeze({
  'Cumplimiento Individual': CUMPLIMIENTO_INDIVIDUAL_SCHEMA,
  'Cumplimiento Entidades': CUMPLIMIENTO_ENTIDADES_SCHEMA,
});

function getSchemaByTemplateId(templateId) {
  return SCHEMA_BY_TEMPLATE_ID[templateId] || null;
}

function getSchemaByFormType(formType) {
  return SCHEMA_BY_FORM_TYPE[formType] || null;
}

function emptyStateForSchema(schema) {
  const state = {};
  if (!schema) return state;
  for (const step of schema.steps) {
    for (const field of step.fields) {
      if (field.type === 'checkboxGroup') {
        state[field.key] = [];
      } else if (field.key === 'declarationDate') {
        state[field.key] = new Date().toISOString().split('T')[0];
      } else if (field.key === 'pep') {
        state[field.key] = 'No';
      } else {
        state[field.key] = '';
      }
    }
  }
  return state;
}

function validateStep(schema, stepIndex, data) {
  const step = schema?.steps?.[stepIndex - 1];
  if (!step) return { ok: true, errors: [] };
  const errors = [];
  for (const field of step.fields) {
    if (field.showIf) {
      const actual = data?.[field.showIf.field];
      if (actual !== field.showIf.value) continue;
    }
    const value = data?.[field.key];
    const conditional = field.requiredIf && data?.[field.requiredIf.field] === field.requiredIf.value;
    if (!field.required && !conditional) continue;
    if (field.type === 'checkboxGroup') {
      if (!Array.isArray(value) || value.length === 0) {
        errors.push(field.key);
      }
      continue;
    }
    if (value === undefined || value === null || String(value).trim() === '') {
      errors.push(field.key);
    }
  }
  return { ok: errors.length === 0, errors };
}

function validateAll(schema, data) {
  if (!schema) return { ok: false, errors: ['schema'] };
  const allErrors = [];
  for (let i = 1; i <= schema.steps.length; i += 1) {
    const { errors } = validateStep(schema, i, data);
    allErrors.push(...errors);
  }
  return { ok: allErrors.length === 0, errors: allErrors };
}

function listSchemaFieldKeys(schema) {
  if (!schema) return [];
  return schema.steps.flatMap((s) => s.fields.map((f) => f.key));
}

module.exports = {
  MARITAL_OPTIONS,
  FUNDS_SOURCE_OPTIONS,
  CUMPLIMIENTO_INDIVIDUAL_SCHEMA,
  CUMPLIMIENTO_ENTIDADES_SCHEMA,
  KYCE_FUNDS_SOURCE_OPTIONS,
  SCHEMA_BY_TEMPLATE_ID,
  SCHEMA_BY_FORM_TYPE,
  getSchemaByTemplateId,
  getSchemaByFormType,
  emptyStateForSchema,
  validateStep,
  validateAll,
  listSchemaFieldKeys,
};
