'use strict';

/**
 * Secciones y claves KYCI/KYCE — alineado con lib/kyciMasterSpec.cjs y pdfFormSchemas.
 */

const pdfFormSchemas = require('./pdfFormSchemas');
const kyciMaster = require('../../lib/kyciMasterSpec.cjs');

const KYCI_PDF_SECTIONS = Object.freeze(
  kyciMaster.SECTIONS.map((s) => ({
    sectionKey: s.sectionKey,
    fields: s.fieldKeys,
    ...(s.fundsSource ? { fundsSource: true } : {}),
  }))
);

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

function flattenSectionFields(sections) {
  const keys = [];
  for (const section of sections) {
    keys.push(...section.fields);
    if (section.fundsSource) keys.push('fundsSource');
  }
  return keys;
}

const KYCI_ALL_FIELD_KEYS = Object.freeze(kyciMaster.KYCI_ALL_FIELD_KEYS);
const KYCE_ALL_FIELD_KEYS = Object.freeze(flattenSectionFields(KYCE_PDF_SECTIONS));
const DATE_FIELD_KEYS = kyciMaster.DATE_FIELD_KEYS;

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

function assertKyciMasterSpecParity() {
  const masterKeys = [...kyciMaster.KYCI_ALL_FIELD_KEYS].sort();
  const regKeys = [...KYCI_ALL_FIELD_KEYS].sort();
  if (masterKeys.length !== regKeys.length || masterKeys.some((k, i) => k !== regKeys[i])) {
    throw new Error('KYCI: kycPdfFieldRegistry desalineado con kyciMasterSpec');
  }
}

module.exports = {
  KYCI_PDF_SECTIONS,
  KYCE_PDF_SECTIONS,
  KYCI_ALL_FIELD_KEYS,
  KYCE_ALL_FIELD_KEYS,
  DATE_FIELD_KEYS,
  assertKycPdfFieldRegistryParity,
  assertKyciMasterSpecParity,
};
