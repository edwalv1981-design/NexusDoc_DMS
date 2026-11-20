'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const kyce = require('../../lib/kyceMasterSpec.cjs');
const pdfFormSchemas = require('../config/pdfFormSchemas');
const { assertKycPdfFieldRegistryParity } = require('../config/kycPdfFieldRegistry');

function complete(extra = {}) {
  return {
    panamaEntityName: 'Atlántico S.A.', applicantRoles: ['shareholder'], legalName: 'Atlantic Ltd.', incorporationDate: '2015-06-01', jurisdiction: 'BVI',
    registrationNumber: '1', registeredAddress: 'Road Town', phone: '+1', businessActivity: 'Holding',
    offenceConvicted: 'No', offenceInvestigation: 'No', applicantType: 'privateCompany',
    privateDocs: kyce.PRIVATE_DOC_OPTIONS.map((o) => o.key), privateBankDocs: ['bankStatement'], fatcaClassification: 'activeNFFE',
    usEntity: 'No', otherTaxResidence: 'No', dataConsent: 'Sí', declarationName: 'Ana Pérez', declarationDate: '2026-11-15', ...extra,
  };
}

describe('kyceMasterSpec (plantilla oficial Entities)', () => {
  it('4 pasos y esquema/registro alineados', () => {
    assert.equal(kyce.SECTIONS.length, 4);
    assert.doesNotThrow(() => assertKycPdfFieldRegistryParity());
    const keys = pdfFormSchemas.listSchemaFieldKeys(pdfFormSchemas.CUMPLIMIENTO_ENTIDADES_SCHEMA);
    assert.deepEqual([...keys].sort(), [...kyce.KYCE_ALL_FIELD_KEYS].sort());
  });

  it('no pide campos que la plantilla no tiene', () => {
    for (const k of kyce.LEGACY_FIELD_KEYS) assert.ok(!kyce.KYCE_ALL_FIELD_KEYS.includes(k), k);
  });

  it('plantilla 2026-11: 10 roles, 5 tipos (sin Partnerships) y 5 clasificaciones FATCA', () => {
    assert.equal(kyce.APPLICANT_ROLE_OPTIONS.length, 10);
    assert.deepEqual(kyce.APPLICANT_TYPE_OPTIONS.map((o) => o.key), ['publicCompany', 'regulatedEntity', 'governmentEntity', 'privateCompany', 'trustFoundation']);
    assert.equal(kyce.PRIVATE_BANK_DOC_OPTIONS.length, 2);
    assert.equal(kyce.FATCA_OPTIONS.length, 5);
    assert.equal(kyce.PRIVATE_DOC_OPTIONS.length, 6);
    assert.equal(kyce.TRUST_DOC_OPTIONS.length, 3);
    assert.equal(kyce.PARTNERSHIP_DOC_OPTIONS.length, 5);
  });

  it('formulario vacío exige los datos de la plantilla', () => {
    const miss = kyce.missingFields({});
    for (const k of ['panamaEntityName', 'applicantRoles', 'legalName', 'registrationNumber', 'offenceConvicted', 'applicantType', 'fatcaClassification', 'usEntity', 'dataConsent', 'declarationName', 'declarationDate']) {
      assert.ok(miss.includes(k), k);
    }
    assert.ok(!miss.includes('mailingAddress'));
    assert.ok(!miss.includes('stockExchange'), 'solo se exige la sección del tipo elegido');
  });

  it('formulario completo pasa la validación', () => {
    assert.deepEqual(kyce.missingFields(complete()), []);
  });

  it('exige lo de cada tipo de solicitante', () => {
    assert.deepEqual(kyce.missingFieldsForStep(2, { applicantType: 'publicCompany' }), ['stockExchange', 'tickerSymbol']);
    const trust = kyce.missingFieldsForStep(2, { applicantType: 'trustFoundation', trustDocs: ['trustDeed'] });
    assert.deepEqual(trust.sort(), ['beneficiary1', 'settlorNameAddress', 'trustDocs.dueDiligence', 'trusteesNameAddress'].sort());
    // Empresa privada: al menos uno de cuenta bancaria / carta de abogado.
    const priv = complete({ privateBankDocs: [] });
    assert.deepEqual(kyce.missingFields(priv), ['privateBankDocs']);
    assert.deepEqual(kyce.missingFields(complete({ privateBankDocs: ['attorneyLetter'] })), []);
    // Trámites antiguos con "partnership": ya no se exige la sección retirada.
    assert.deepEqual(kyce.missingFieldsForStep(2, { applicantType: 'partnership' }), []);
  });

  it('respuestas Sí y FATCA exigen su detalle', () => {
    const miss = kyce.missingFields(complete({ offenceConvicted: 'Sí', usEntity: 'Sí', otherTaxResidence: 'Sí', fatcaClassification: 'sponsoredFFI' }));
    assert.deepEqual(miss.sort(), ['einNumber', 'fatcaSponsorGiin', 'offenceConvictedDetails', 'otherTaxResidenceDetails', 'taxIdNumber'].sort());
  });

  it('textos guía en ES y EN para los mismos campos', () => {
    assert.deepEqual(Object.keys(kyce.FORM_GUIDES.es).sort(), Object.keys(kyce.FORM_GUIDES.en).sort());
    for (const k of kyce.KYCE_ALL_FIELD_KEYS) assert.ok(kyce.FORM_LABELS.es[k] && kyce.FORM_LABELS.en[k], `falta etiqueta ${k}`);
    const extra = Object.keys(kyce.FORM_LABELS.es).filter((k) => !kyce.KYCE_ALL_FIELD_KEYS.includes(k));
    for (const k of extra) assert.ok(kyce.LEGACY_FIELD_KEYS.includes(k), `etiqueta sobrante ${k}`);
  });
});
