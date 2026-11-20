'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const kyciMaster = require('../../lib/kyciMasterSpec.cjs');
const pdfFormSchemas = require('../config/pdfFormSchemas');
const {
  assertKycPdfFieldRegistryParity,
  assertKyciMasterSpecParity,
} = require('../config/kycPdfFieldRegistry');

/** Plantilla oficial PTL_KYC – Compliance Form – Individuals. */
describe('kyciMasterSpec (plantilla oficial)', () => {
  it('define 4 secciones en el orden de la plantilla', () => {
    assert.equal(kyciMaster.SECTIONS.length, 4);
    assert.deepEqual(kyciMaster.SECTIONS.map((s) => s.stepId), ['personal', 'contact', 'compliance', 'declaration']);
    assert.match(kyciMaster.SECTIONS[0].titleEs, /^I\./);
    assert.match(kyciMaster.SECTIONS[3].titleEs, /^IV\./);
  });

  it('incluye todos los campos de la plantilla', () => {
    const keys = kyciMaster.KYCI_ALL_FIELD_KEYS;
    for (const k of [
      'panamaEntityName', 'applicantRoles', 'firstName', 'secondName', 'lastName', 'birthDate',
      'nationality', 'birthPlace', 'passport', 'address', 'maritalStatus', 'phone', 'email', 'idCard',
      'taxResidenceCountries', 'otherTaxResidence', 'otherTaxResidenceDetails', 'usPerson', 'usTin', 'usDetails',
      'sourceOfWealth', 'pep', 'pepDetails',
      'offenceConvicted', 'offenceConvictedDetails', 'offenceBankrupt', 'offenceBankruptDetails',
      'offenceInvestigation', 'offenceInvestigationDetails', 'certifiedDocs', 'dataConsent', 'declarationName', 'declarationDate',
    ]) {
      assert.ok(keys.includes(k), `falta ${k}`);
    }
  });

  it('no pide campos que la plantilla no tiene', () => {
    for (const k of kyciMaster.LEGACY_FIELD_KEYS) {
      assert.ok(!kyciMaster.KYCI_ALL_FIELD_KEYS.includes(k), `${k} no está en la plantilla`);
    }
  });

  it('textos sin referencias a las notas eliminadas', () => {
    const all = JSON.stringify([kyciMaster.CERTIFIED_DOC_OPTIONS, kyciMaster.FORM_GUIDES]);
    assert.doesNotMatch(all, /see Note|ver Nota|see Notes|ver las Notas/);
  });

  it('tiene las 10 calidades del solicitante y los 6 documentos', () => {
    assert.deepEqual(kyciMaster.APPLICANT_ROLE_OPTIONS.map((o) => o.en), [
      'Shareholder', 'Director', 'General Partner', 'Beneficial Owner', 'Authorised Signatory',
      'Power of Attorney', 'Founder/Settlor', 'Enforcer', 'Protector', 'Member',
    ]);
    assert.deepEqual(kyciMaster.CERTIFIED_DOC_OPTIONS.map((o) => o.key), ['passport', 'idCopy', 'proofOfAddress', 'bankReference', 'cv', 'professionalReference']);
    assert.doesNotMatch(JSON.stringify(kyciMaster.CERTIFIED_DOC_OPTIONS), /W9|[Cc]ertified/);
  });

  it('registry y pdfFormSchemas alineados con master spec', () => {
    assert.doesNotThrow(() => assertKycPdfFieldRegistryParity());
    assert.doesNotThrow(() => assertKyciMasterSpecParity());
    const schemaKeys = pdfFormSchemas.listSchemaFieldKeys(pdfFormSchemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA);
    assert.deepEqual([...schemaKeys].sort(), [...kyciMaster.KYCI_ALL_FIELD_KEYS].sort());
    assert.equal(pdfFormSchemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA.steps.length, 4);
  });

  it('formulario vacío no se puede enviar', () => {
    const miss = kyciMaster.missingFields({});
    for (const k of ['panamaEntityName', 'applicantRoles', 'firstName', 'lastName', 'passport', 'idCard', 'sourceOfWealth', 'pep', 'usPerson', 'dataConsent', 'declarationName', 'declarationDate']) {
      assert.ok(miss.includes(k), `debe exigir ${k}`);
    }
    assert.ok(!miss.includes('secondName'), 'segundo nombre es opcional');
    assert.ok(!miss.includes('pepDetails'), 'detalle PEP solo si responde Sí');
  });

  it('respuestas "Sí" exigen su detalle; persona de EE. UU. exige TIN (ya no W9)', () => {
    const data = { pep: 'Sí', offenceBankrupt: 'Sí', otherTaxResidence: 'Sí', usPerson: 'Sí', certifiedDocs: ['passport'] };
    const miss = kyciMaster.missingFields(data);
    for (const k of ['pepDetails', 'offenceBankruptDetails', 'otherTaxResidenceDetails', 'usTin']) {
      assert.ok(miss.includes(k), `debe exigir ${k}`);
    }
    assert.ok(!miss.includes('certifiedDocs.w9'));
  });

  it('documentos obligatorios: todos menos la referencia profesional; autorización de datos obligatoria', () => {
    const miss = kyciMaster.missingFieldsForStep(4, { certifiedDocs: ['professionalReference'], declarationName: 'Ana', declarationDate: '2026-11-15' });
    assert.deepEqual(miss, ['certifiedDocs.passport', 'certifiedDocs.idCopy', 'certifiedDocs.proofOfAddress', 'certifiedDocs.bankReference', 'certifiedDocs.cv', 'dataConsent']);
  });

  it('formulario completo pasa la validación', () => {
    assert.deepEqual(kyciMaster.missingFields(completeKyci()), []);
  });

  it('compatibilidad: nombre completo y origen del patrimonio de trámites antiguos', () => {
    assert.equal(kyciMaster.computeFullName({ firstName: 'Ana', secondName: 'María', lastName: 'Pérez Gil' }), 'Ana María Pérez Gil');
    assert.equal(kyciMaster.computeFullName({ fullName: 'Juan Torres' }), 'Juan Torres');
    assert.deepEqual(kyciMaster.splitLegacyFullName('María Elena González Pérez'), { firstName: 'María', secondName: 'Elena', lastName: 'González Pérez' });
    assert.match(kyciMaster.legacySourceOfWealth({ fundsSource: ['Negocios'], occupation: 'Abogada' }), /Negocios.*Abogada/);
  });
});

function completeKyci() {
  return {
    panamaEntityName: 'Atlántico S.A.', applicantRoles: ['director'], firstName: 'Ana', lastName: 'Pérez',
    birthDate: '1990-01-01', nationality: 'Panameña', birthPlace: 'Panamá', passport: 'P1', address: 'Calle 1',
    maritalStatus: 'Soltero(a)', phone: '+507 1', email: 'a@b.com', idCard: '8-888-8888', taxResidenceCountries: 'Panamá',
    otherTaxResidence: 'No', usPerson: 'No', sourceOfWealth: 'Salario', pep: 'No', offenceConvicted: 'No',
    offenceBankrupt: 'No', offenceInvestigation: 'No', certifiedDocs: ['passport', 'idCopy', 'proofOfAddress', 'bankReference', 'cv'],
    dataConsent: 'Sí', declarationName: 'Ana Pérez', declarationDate: '2026-11-15',
  };
}

module.exports = { completeKyci };
