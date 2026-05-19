'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const routing = require('../../lib/formWizardRouting.cjs');

describe('ClientDashboard KYCI routing', () => {
  const dashboardPath = path.join(__dirname, '../../client/src/pages/ClientDashboard.jsx');
  const src = fs.readFileSync(dashboardPath, 'utf8');

  it('importa enrutamiento compartido y usa PdfSchemaWizard para KYCI', () => {
    assert.match(src, /from '\.\.\/utils\/formWizardRouting'/);
    assert.match(src, /usesSchemaWizard\(currentFormType\)/);
    assert.match(src, /<PdfSchemaWizard/);
    assert.doesNotMatch(src, /usesSchemaWizard\s*=\s*\(type\)\s*=>\s*type\s*===\s*'Fondos/);
  });

  it('no enruta Cumplimiento Individual al asistente Fondos', () => {
    assert.equal(routing.usesFondosWizard('Cumplimiento Individual'), false);
    assert.equal(routing.usesSchemaWizard('Cumplimiento Individual'), true);
    assert.match(src, /usesFondosWizard\(currentFormType\)/);
  });
});
