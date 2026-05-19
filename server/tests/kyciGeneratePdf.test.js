'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const stablePdfForms = require('../config/stablePdfForms');
const templateAvailability = require('../utils/templateAvailability');

describe('KYCI HTML PDF route contract', () => {
  it('isKyciHtmlForm identifica Cumplimiento Individual', () => {
    assert.equal(stablePdfForms.isKyciHtmlForm('Cumplimiento Individual'), true);
    assert.equal(stablePdfForms.isKyciHtmlForm('KYCI'), true);
    assert.equal(stablePdfForms.isKyciHtmlForm('Fondos Registros contables'), false);
  });

  it('checkTemplateExists no exige KYCI.pdf en disco', async () => {
    const mockModel = { findOne: async () => null };
    const ok = await templateAvailability.checkTemplateExists('Cumplimiento Individual', mockModel);
    assert.equal(ok, true);
  });

  it('isHtmlEngineForm incluye KYCI', () => {
    assert.equal(templateAvailability.isHtmlEngineForm('Cumplimiento Individual'), true);
  });

  it('isInteractiveFormAvailable siempre true para KYCI', () => {
    assert.equal(
      templateAvailability.isInteractiveFormAvailable('Cumplimiento Individual', {}),
      true
    );
  });
});
