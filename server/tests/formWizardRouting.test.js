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

  it('usesSchemaWizard desactivado; formularios dedicados KYCI/KYCE', () => {
    assert.equal(routing.usesSchemaWizard('Cumplimiento Individual'), false);
    assert.equal(routing.usesSchemaWizard('cumplimiento_individual'), false);
    assert.equal(routing.usesSchemaWizard('Cumplimiento Entidades'), false);
    assert.equal(routing.usesSchemaWizard('Fondos Registros contables'), false);
    assert.equal(routing.usesDedicatedKyciForm('Cumplimiento Individual'), true);
    assert.equal(routing.usesDedicatedKyceForm('Cumplimiento Entidades'), true);
    assert.equal(routing.usesFondosWizard('Fondos Registros contables'), true);
    assert.equal(routing.usesFondosWizard('Cumplimiento Individual'), false);
  });
});
