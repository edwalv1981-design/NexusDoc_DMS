'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const routing = require('../../lib/formWizardRouting.cjs');

describe('ClientDashboard KYCE routing', () => {
  const dashboardPath = path.join(__dirname, '../../client/src/pages/ClientDashboard.jsx');
  const src = fs.readFileSync(dashboardPath, 'utf8');

  it('usa formulario dedicado CumplimientoEntidadesForm para KYCE', () => {
    assert.match(src, /import CumplimientoEntidadesForm from '\.\/CumplimientoEntidadesForm'/);
    assert.match(src, /<CumplimientoEntidadesForm/);
    assert.match(src, /isKyceFormType\(currentFormType\)/);
  });

  it('no enruta Cumplimiento Entidades a PdfSchemaWizard', () => {
    assert.equal(routing.usesSchemaWizard('Cumplimiento Entidades'), false);
    assert.equal(routing.usesDedicatedKyceForm('Cumplimiento Entidades'), true);
    const wizardBlock = src.match(/usesSchemaWizard\(currentFormType\)[\s\S]*?<PdfSchemaWizard/);
    assert.ok(wizardBlock);
    assert.doesNotMatch(wizardBlock[0], /Cumplimiento Entidades/);
  });

  it('trata KYCE como motor HTML en isHtmlFormType', () => {
    assert.match(src, /type === 'Cumplimiento Entidades'/);
  });

  it('no enruta Cumplimiento Entidades al asistente Fondos', () => {
    assert.equal(routing.usesFondosWizard('Cumplimiento Entidades'), false);
  });
});
