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
      'nationality', 'birthPlace', 'passport', 'address', 'maritalStatus', 'phone', 'email',
      'taxResidenceCountries', 'otherTaxResidence', 'otherTaxResidenceDetails', 'usPerson', 'usTin', 'usDetails',
      'sourceOfWealth', 'pep', 'pepDetails',
      'offenceConvicted', 'offenceConvictedDetails', 'offenceBankrupt', 'offenceBankruptDetails',
      'offenceInvestigation', 'offenceInvestigationDetails', 'certifiedDocs', 'declarationDate',
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
    assert.equal(kyciMaster.CERTIFIED_DOC_OPTIONS.length, 6);
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
    for (const k of ['panamaEntityName', 'applicantRoles', 'firstName', 'lastName', 'passport', 'sourceOfWealth', 'pep', 'usPerson', 'declarationDate']) {
      assert.ok(miss.includes(k), `debe exigir ${k}`);
    }
    assert.ok(!miss.includes('secondName'), 'segundo nombre es opcional');
    assert.ok(!miss.includes('pepDetails'), 'detalle PEP solo si responde Sí');
  });

  it('respuestas "Sí" exigen su detalle; persona de EE. UU. exige TIN y W9', () => {
    const data = { pep: 'Sí', offenceBankrupt: 'Sí', otherTaxResidence: 'Sí', usPerson: 'Sí', certifiedDocs: ['passport', 'proofOfAddress', 'cv'] };
    const miss = kyciMaster.missingFields(data);
    for (const k of ['pepDetails', 'offenceBankruptDetails', 'otherTaxResidenceDetails', 'usTin', 'certifiedDocs.w9']) {
      assert.ok(miss.includes(k), `debe exigir ${k}`);
    }
    assert.ok(!kyciMaster.missingFields({ ...data, usPerson: 'No' }).includes('certifiedDocs.w9'));
  });

  it('documentos obligatorios: pasaporte, domicilio y hoja de vida', () => {
    const miss = kyciMaster.missingFieldsForStep(4, { certifiedDocs: ['bankReference'], declarationDate: '2026-11-15' });
    assert.deepEqual(miss, ['certifiedDocs.passport', 'certifiedDocs.proofOfAddress', 'certifiedDocs.cv']);
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
    maritalStatus: 'Soltero(a)', phone: '+507 1', email: 'a@b.com', taxResidenceCountries: 'Panamá',
    otherTaxResidence: 'No', usPerson: 'No', sourceOfWealth: 'Salario', pep: 'No', offenceConvicted: 'No',
    offenceBankrupt: 'No', offenceInvestigation: 'No', certifiedDocs: ['passport', 'proofOfAddress', 'cv'],
    declarationDate: '2026-11-15',
  };
}

module.exports = { completeKyci };
