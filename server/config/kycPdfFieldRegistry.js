'use strict';

/**
 * Secciones y claves de datos KYCI/KYCE — fuente única para formulario, PDF HTML y tests.
 * Alineado con pdfFormSchemas y templates_config.json (PTL_KYC Individuals / Entities).
 */

const pdfFormSchemas = require('./pdfFormSchemas');

const KYCI_PDF_SECTIONS = Object.freeze([
  {
    sectionKey: 'sectionPersonal',
    fields: Object.freeze([
      'firstName',
      'secondName',
      'lastName',
      'birthDate',
      'birthPlace',
      'maritalStatus',
      'nationality',
      'passport',
      'idCard',
    ]),
  },
  {
    sectionKey: 'sectionContact',
    fields: Object.freeze([
      'phone',
      'email',
      'address',
      'city',
      'country',
      'occupation',
      'employer',
    ]),
  },
  {
    sectionKey: 'sectionCompliance',
    fields: Object.freeze(['pep', 'pepDetails', 'fundsOther']),
    fundsSource: true,
  },
  {
    sectionKey: 'sectionDeclaration',
    fields: Object.freeze(['declarationName', 'declarationDate']),
  },
]);

const KYCE_PDF_SECTIONS = Object.freeze([
  {
    sectionKey: 'sectionEntity',
    fields: Object.freeze([
      'legalName',
      'tradeName',
      'entityType',
      'incorporationDate',
      'jurisdiction',
      'taxId',
      'registrationNumber',
      'registeredAddress',
    ]),
  },
  {
    sectionKey: 'sectionContact',
    fields: Object.freeze(['phone', 'email', 'city', 'country', 'businessActivity', 'website']),
  },
  {
    sectionKey: 'sectionRepresentatives',
    fields: Object.freeze(['legalRepName', 'legalRepId', 'legalRepNationality', 'beneficialOwners']),
  },
  {
    sectionKey: 'sectionCompliance',
    fields: Object.freeze(['pep', 'pepDetails', 'fundsOther']),
    fundsSource: true,
  },
  {
    sectionKey: 'sectionDeclaration',
    fields: Object.freeze(['declarationName', 'declarationDate']),
  },
]);

const DATE_FIELD_KEYS = new Set([
  'birthDate',
  'declarationDate',
  'incorporationDate',
]);

function flattenSectionFields(sections) {
  const keys = [];
  for (const section of sections) {
    keys.push(...section.fields);
    if (section.fundsSource) keys.push('fundsSource');
  }
  return keys;
}

const KYCI_ALL_FIELD_KEYS = Object.freeze(flattenSectionFields(KYCI_PDF_SECTIONS));
const KYCE_ALL_FIELD_KEYS = Object.freeze(flattenSectionFields(KYCE_PDF_SECTIONS));

function assertRegistryMatchesSchema(schema, registryKeys, label) {
  const schemaKeys = pdfFormSchemas.listSchemaFieldKeys(schema).sort();
  const regKeys = [...registryKeys].sort();
  if (schemaKeys.length !== regKeys.length || schemaKeys.some((k, i) => k !== regKeys[i])) {
    const missingInReg = schemaKeys.filter((k) => !regKeys.includes(k));
    const extraInReg = regKeys.filter((k) => !schemaKeys.includes(k));
    throw new Error(
      `${label}: registry desalineado con pdfFormSchemas. Falta en registry: [${missingInReg.join(', ')}]; extra: [${extraInReg.join(', ')}]`
    );
  }
}

function assertKycPdfFieldRegistryParity() {
  assertRegistryMatchesSchema(
    pdfFormSchemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA,
    KYCI_ALL_FIELD_KEYS,
    'KYCI'
  );
  assertRegistryMatchesSchema(
    pdfFormSchemas.CUMPLIMIENTO_ENTIDADES_SCHEMA,
    KYCE_ALL_FIELD_KEYS,
    'KYCE'
  );
}

module.exports = {
  KYCI_PDF_SECTIONS,
  KYCE_PDF_SECTIONS,
  KYCI_ALL_FIELD_KEYS,
  KYCE_ALL_FIELD_KEYS,
  DATE_FIELD_KEYS,
  assertKycPdfFieldRegistryParity,
};
