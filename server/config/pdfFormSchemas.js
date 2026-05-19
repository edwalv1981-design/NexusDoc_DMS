'use strict';

/**
 * Esquemas de captura alineados con plantillas PDF (KYCI / KYCE).
 * Claves `data_key` deben coincidir con `templates_config.json` y el estado del formulario cliente.
 */

const MARITAL_OPTIONS = Object.freeze(['Soltero(a)', 'Casado(a)', 'Divorciado(a)', 'Viudo(a)', 'Unión libre']);

const FUNDS_SOURCE_OPTIONS = Object.freeze([
  { key: 'Bienes personales', labelKey: 'bienes' },
  { key: 'Inversiones Financieras', labelKey: 'inversiones' },
  { key: 'Negocios', labelKey: 'negocios' },
  { key: 'Prestamos', labelKey: 'prestamos' },
  { key: 'Herencia o Fondo Fiduciario', labelKey: 'herencia' },
]);

const CUMPLIMIENTO_INDIVIDUAL_SCHEMA = Object.freeze({
  templateId: 'cumplimiento_individual',
  formType: 'Cumplimiento Individual',
  i18nPrefix: 'kyci',
  steps: Object.freeze([
    {
      id: 'personal',
      titleKey: 'steps.personal',
      fields: Object.freeze([
        { key: 'firstName', type: 'text', required: true, col: 'half' },
        { key: 'secondName', type: 'text', col: 'half' },
        { key: 'lastName', type: 'text', required: true, col: 'full' },
        { key: 'birthDate', type: 'date', required: true, col: 'half' },
        { key: 'birthPlace', type: 'text', required: true, col: 'half' },
        { key: 'maritalStatus', type: 'select', options: MARITAL_OPTIONS, col: 'half' },
        { key: 'nationality', type: 'text', required: true, col: 'half' },
        { key: 'passport', type: 'text', required: true, col: 'half' },
        { key: 'idCard', type: 'text', col: 'half' },
      ]),
    },
    {
      id: 'contact',
      titleKey: 'steps.contact',
      fields: Object.freeze([
        { key: 'phone', type: 'text', required: true, col: 'half' },
        { key: 'email', type: 'email', required: true, col: 'half' },
        { key: 'address', type: 'text', required: true, col: 'full' },
        { key: 'city', type: 'text', required: true, col: 'half' },
        { key: 'country', type: 'text', required: true, col: 'half' },
        { key: 'occupation', type: 'text', required: true, col: 'half' },
        { key: 'employer', type: 'text', col: 'half' },
      ]),
    },
    {
      id: 'compliance',
      titleKey: 'steps.compliance',
      fields: Object.freeze([
        { key: 'pep', type: 'select', options: ['No', 'Sí'], required: true, col: 'half' },
        { key: 'pepDetails', type: 'textarea', col: 'full', showIf: { field: 'pep', value: 'Sí' } },
        {
          key: 'fundsSource',
          type: 'checkboxGroup',
          required: true,
          options: FUNDS_SOURCE_OPTIONS,
          col: 'full',
        },
        { key: 'fundsOther', type: 'text', col: 'full' },
        { key: 'declarationName', type: 'text', required: true, col: 'half' },
        { key: 'declarationDate', type: 'date', required: true, col: 'half' },
      ]),
    },
  ]),
});

const SCHEMA_BY_TEMPLATE_ID = Object.freeze({
  cumplimiento_individual: CUMPLIMIENTO_INDIVIDUAL_SCHEMA,
});

const SCHEMA_BY_FORM_TYPE = Object.freeze({
  'Cumplimiento Individual': CUMPLIMIENTO_INDIVIDUAL_SCHEMA,
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
    if (!field.required) continue;
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
  SCHEMA_BY_TEMPLATE_ID,
  SCHEMA_BY_FORM_TYPE,
  getSchemaByTemplateId,
  getSchemaByFormType,
  emptyStateForSchema,
  validateStep,
  validateAll,
  listSchemaFieldKeys,
};
