'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const kyce = require('../../lib/kyceMasterSpec.cjs');
const pdfFormSchemas = require('../config/pdfFormSchemas');
const { assertKycPdfFieldRegistryParity } = require('../config/kycPdfFieldRegistry');

function complete(extra = {}) {
  return {
    panamaEntityName: 'Atlántico S.A.', legalName: 'Atlantic Ltd.', incorporationDate: '2015-06-01', jurisdiction: 'BVI',
    registrationNumber: '1', registeredAddress: 'Road Town', phone: '+1', businessActivity: 'Holding',
    offenceConvicted: 'No', offenceInvestigation: 'No', applicantType: 'privateCompany',
    privateDocs: kyce.PRIVATE_DOC_OPTIONS.map((o) => o.key), fatcaClassification: 'activeNFFE',
    usEntity: 'No', otherTaxResidence: 'No', declarationDate: '2026-11-15', ...extra,
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

  it('6 tipos de solicitante y 5 clasificaciones FATCA', () => {
    assert.equal(kyce.APPLICANT_TYPE_OPTIONS.length, 6);
    assert.equal(kyce.FATCA_OPTIONS.length, 5);
    assert.equal(kyce.PRIVATE_DOC_OPTIONS.length, 6);
    assert.equal(kyce.TRUST_DOC_OPTIONS.length, 3);
    assert.equal(kyce.PARTNERSHIP_DOC_OPTIONS.length, 5);
  });

  it('formulario vacío exige los datos de la plantilla', () => {
    const miss = kyce.missingFields({});
    for (const k of ['panamaEntityName', 'legalName', 'registrationNumber', 'offenceConvicted', 'applicantType', 'fatcaClassification', 'usEntity', 'declarationDate']) {
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
    assert.ok(kyce.missingFieldsForStep(2, { applicantType: 'partnership' }).includes('partnershipDocs'));
  });

  it('respuestas Sí y FATCA exigen su detalle', () => {
    const miss = kyce.missingFields(complete({ offenceConvicted: 'Sí', usEntity: 'Sí', otherTaxResidence: 'Sí', fatcaClassification: 'sponsoredFFI' }));
    assert.deepEqual(miss.sort(), ['einNumber', 'fatcaSponsorGiin', 'offenceConvictedDetails', 'otherTaxResidenceDetails', 'taxIdNumber'].sort());
  });

  it('textos guía en ES y EN para los mismos campos', () => {
    assert.deepEqual(Object.keys(kyce.FORM_GUIDES.es).sort(), Object.keys(kyce.FORM_GUIDES.en).sort());
    assert.deepEqual(Object.keys(kyce.FORM_LABELS.es).sort(), [...kyce.KYCE_ALL_FIELD_KEYS].sort());
  });
});
