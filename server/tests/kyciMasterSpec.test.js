'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const kyciMaster = require('../../lib/kyciMasterSpec.cjs');
const pdfFormSchemas = require('../config/pdfFormSchemas');
const {
  KYCI_PDF_SECTIONS,
  KYCI_ALL_FIELD_KEYS,
  assertKycPdfFieldRegistryParity,
  assertKyciMasterSpecParity,
} = require('../config/kycPdfFieldRegistry');
const { getKyciPdfDict } = require('../services/kyciPdfI18n');

describe('kyciMasterSpec', () => {
  it('define 4 secciones en orden del PDF PTL_KYC Individuals', () => {
    assert.equal(kyciMaster.SECTIONS.length, 4);
    assert.equal(kyciMaster.SECTIONS[0].sectionKey, 'sectionPersonal');
    assert.equal(kyciMaster.SECTIONS[3].sectionKey, 'sectionDeclaration');
    assert.match(kyciMaster.SECTIONS[0].titleEs, /^I\./);
    assert.match(kyciMaster.SECTIONS[3].titleEs, /^IV\./);
  });

  it('registry y pdfFormSchemas alineados con master spec', () => {
    assert.doesNotThrow(() => assertKycPdfFieldRegistryParity());
    assert.doesNotThrow(() => assertKyciMasterSpecParity());
    const schemaKeys = pdfFormSchemas.listSchemaFieldKeys(
      pdfFormSchemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA
    );
    assert.deepEqual([...schemaKeys].sort(), [...kyciMaster.KYCI_ALL_FIELD_KEYS].sort());
    assert.equal(pdfFormSchemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA.steps.length, 4);
  });

  it('etiquetas PDF i18n cubren todos los campos del master', () => {
    const t = getKyciPdfDict('es');
    for (const key of KYCI_ALL_FIELD_KEYS) {
      if (key === 'fundsSource') {
        assert.ok(t.fundsSource, `falta label fundsSource`);
        continue;
      }
      assert.ok(t[key], `falta label i18n PDF para ${key}`);
    }
    for (const section of KYCI_PDF_SECTIONS) {
      assert.ok(t[section.sectionKey], `falta título sección ${section.sectionKey}`);
    }
  });

  it('opciones de origen de fondos coinciden con templates_config', () => {
    const keys = kyciMaster.FUNDS_SOURCE_OPTIONS.map((o) => o.key);
    assert.deepEqual(keys, [
      'Bienes personales',
      'Inversiones Financieras',
      'Negocios',
      'Prestamos',
      'Herencia o Fondo Fiduciario',
      'Otras formas de ingresos',
    ]);
  });
});
