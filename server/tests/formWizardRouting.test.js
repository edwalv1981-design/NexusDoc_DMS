'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const routing = require('../../lib/formWizardRouting.cjs');

describe('formWizardRouting', () => {
  it('normaliza variantes de Cumplimiento Individual', () => {
    assert.equal(routing.resolveCanonicalFormType('Cumplimiento Individual'), 'Cumplimiento Individual');
    assert.equal(routing.resolveCanonicalFormType('cumplimiento_individual'), 'Cumplimiento Individual');
    assert.equal(routing.resolveCanonicalFormType('KYCI'), 'Cumplimiento Individual');
  });

  it('usesSchemaWizard solo para KYCI/KYCE, no Fondos', () => {
    assert.equal(routing.usesSchemaWizard('Cumplimiento Individual'), true);
    assert.equal(routing.usesSchemaWizard('cumplimiento_individual'), true);
    assert.equal(routing.usesSchemaWizard('Cumplimiento Entidades'), true);
    assert.equal(routing.usesSchemaWizard('Fondos Registros contables'), false);
    assert.equal(routing.usesFondosWizard('Fondos Registros contables'), true);
    assert.equal(routing.usesFondosWizard('Cumplimiento Individual'), false);
  });
});
