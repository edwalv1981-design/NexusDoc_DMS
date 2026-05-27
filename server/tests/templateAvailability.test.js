'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const t = require('../utils/templateAvailability');
const stablePdfForms = require('../config/stablePdfForms');

describe('templateAvailability', () => {
  it('Corporación, Fundaciones, Fondos, KYCI y KYCE usan motor HTML sin PDF obligatorio', () => {
    assert.equal(t.isHtmlEngineForm(stablePdfForms.FORM_TYPE_CORPORACION), true);
    assert.equal(t.isHtmlEngineForm(stablePdfForms.FORM_TYPE_FUNDACION), true);
    assert.equal(t.isHtmlEngineForm('Cumplimiento Individual'), true);
    assert.equal(t.isHtmlEngineForm('Cumplimiento Entidades'), true);
    assert.equal(t.isHtmlEngineForm(stablePdfForms.FORM_TYPE_FONDOS_SFAR), true);
  });

  it('isInteractiveFormAvailable respeta mapa de estado del cliente', () => {
    const map = {
      [stablePdfForms.FORM_TYPE_FONDOS_SFAR]: false,
      [stablePdfForms.FORM_TYPE_CORPORACION]: true,
      [stablePdfForms.FORM_TYPE_FUNDACION]: true,
      'Cumplimiento Individual': true,
      'Cumplimiento Entidades': false,
    };
    assert.equal(t.isInteractiveFormAvailable(stablePdfForms.FORM_TYPE_CORPORACION, map), true);
    assert.equal(t.isInteractiveFormAvailable(stablePdfForms.FORM_TYPE_FONDOS_SFAR, map), true);
    assert.equal(t.isInteractiveFormAvailable('Cumplimiento Individual', map), true);
    assert.equal(t.isInteractiveFormAvailable('Cumplimiento Entidades', map), true);
  });

  it('usesPdfWizardForm solo para Fondos (SFAR)', () => {
    assert.equal(t.usesPdfWizardForm(stablePdfForms.FORM_TYPE_FONDOS_SFAR), true);
    assert.equal(t.usesPdfWizardForm('Cumplimiento Individual'), false);
    assert.equal(t.usesPdfWizardForm('Cumplimiento Entidades'), false);
    assert.equal(t.usesPdfWizardForm(stablePdfForms.FORM_TYPE_CORPORACION), false);
  });

  it('checkTemplateExists KYCI siempre true (motor HTML)', async () => {
    const mockModel = { findOne: async () => null };
    const ok = await t.checkTemplateExists('Cumplimiento Individual', mockModel);
    assert.equal(ok, true);
  });

  it('checkTemplateExists KYCE siempre true (motor HTML)', async () => {
    const mockModel = { findOne: async () => null };
    const ok = await t.checkTemplateExists('Cumplimiento Entidades', mockModel);
    assert.equal(ok, true);
  });

  it('checkTemplateExists Fondos siempre true (motor HTML)', async () => {
    const mockModel = { findOne: async () => null };
    const ok = await t.checkTemplateExists(stablePdfForms.FORM_TYPE_FONDOS_SFAR, mockModel);
    assert.equal(ok, true);
  });
});
