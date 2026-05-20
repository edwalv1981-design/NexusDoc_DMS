'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const routing = require('../../lib/formWizardRouting.cjs');

describe('ClientDashboard KYCI routing', () => {
  const dashboardPath = path.join(__dirname, '../../client/src/pages/ClientDashboard.jsx');
  const src = fs.readFileSync(dashboardPath, 'utf8');

  it('usa formulario dedicado CumplimientoIndividualForm para KYCI', () => {
    assert.match(src, /import CumplimientoIndividualForm from '\.\/CumplimientoIndividualForm'/);
    assert.match(src, /<CumplimientoIndividualForm/);
    assert.match(src, /isKyciFormType\(currentFormType\)/);
  });

  it('no enruta Cumplimiento Individual a PdfSchemaWizard', () => {
    assert.equal(routing.usesSchemaWizard('Cumplimiento Individual'), false);
    assert.equal(routing.usesDedicatedKyciForm('Cumplimiento Individual'), true);
    const wizardBlock = src.match(/usesSchemaWizard\(currentFormType\)[\s\S]*?<PdfSchemaWizard/);
    assert.ok(wizardBlock);
    assert.doesNotMatch(wizardBlock[0], /Cumplimiento Individual/);
  });

  it('trata KYCI como motor HTML en isHtmlFormType', () => {
    assert.match(src, /type === 'Cumplimiento Individual'/);
  });

  it('no enruta Cumplimiento Individual al asistente Fondos', () => {
    assert.equal(routing.usesFondosWizard('Cumplimiento Individual'), false);
  });
});
