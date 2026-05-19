'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const stablePdfForms = require('../config/stablePdfForms');
const templateAvailability = require('../utils/templateAvailability');

describe('KYCE HTML PDF route contract', () => {
  it('isKyceHtmlForm identifica Cumplimiento Entidades', () => {
    assert.equal(stablePdfForms.isKyceHtmlForm('Cumplimiento Entidades'), true);
    assert.equal(stablePdfForms.isKyceHtmlForm('KYCE'), true);
    assert.equal(stablePdfForms.isKyceHtmlForm('Cumplimiento Individual'), false);
    assert.equal(stablePdfForms.isKyceHtmlForm('Fondos Registros contables'), false);
  });

  it('checkTemplateExists no exige KYCE.pdf en disco', async () => {
    const mockModel = { findOne: async () => null };
    const ok = await templateAvailability.checkTemplateExists('Cumplimiento Entidades', mockModel);
    assert.equal(ok, true);
  });

  it('isHtmlEngineForm incluye KYCE', () => {
    assert.equal(templateAvailability.isHtmlEngineForm('Cumplimiento Entidades'), true);
  });

  it('isInteractiveFormAvailable siempre true para KYCE', () => {
    assert.equal(
      templateAvailability.isInteractiveFormAvailable('Cumplimiento Entidades', {}),
      true
    );
  });
});
