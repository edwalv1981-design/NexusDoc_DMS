'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const schemas = require('../config/pdfFormSchemas');
const stablePdfForms = require('../config/stablePdfForms');

describe('pdfFormSchemas', () => {
  it('resuelve esquema KYCI por formType y templateId', () => {
    const byType = schemas.getSchemaByFormType('Cumplimiento Individual');
    const byTpl = schemas.getSchemaByTemplateId('cumplimiento_individual');
    assert.ok(byType);
    assert.equal(byType, byTpl);
    assert.equal(
      stablePdfForms.getPdfTemplateNameForForm('Cumplimiento Individual'),
      'cumplimiento_individual'
    );
  });

  it('estado vacío incluye claves personales (no campos SFAR)', () => {
    const empty = schemas.emptyStateForSchema(schemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA);
    assert.equal(empty.companyName, undefined);
    assert.equal(empty.beneficiaryName, undefined);
    assert.ok(empty.firstName !== undefined);
    assert.ok(empty.lastName !== undefined);
    assert.ok(Array.isArray(empty.applicantRoles));
    assert.ok(Array.isArray(empty.certifiedDocs));
  });

  it('valida paso 1 exige nombre y documento', () => {
    const partial = schemas.emptyStateForSchema(schemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA);
    partial.firstName = 'Ana';
    const r = schemas.validateStep(schemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA, 1, partial);
    assert.equal(r.ok, false);
    assert.ok(r.errors.includes('passport'));
    assert.ok(r.errors.includes('lastName'));
    const pepYes = schemas.validateStep(schemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA, 3, { pep: 'Sí' });
    assert.ok(pepYes.errors.includes('pepDetails'), 'PEP Sí exige detalle');
  });

  it('resuelve esquema KYCE por formType y templateId', () => {
    const byType = schemas.getSchemaByFormType('Cumplimiento Entidades');
    const byTpl = schemas.getSchemaByTemplateId('cumplimiento_entidades');
    assert.ok(byType);
    assert.equal(byType, byTpl);
    assert.ok(byType.steps.some((s) => s.id === 'entity'));
    assert.ok(byType.steps.some((s) => s.fields.some((f) => f.key === 'legalName')));
  });

  it('mapeo de campos alineado con templates_config KYCI', () => {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../../templates/templates_config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const kyci = config.cumplimiento_individual;
    assert.ok(kyci?.anchors?.length);
    // KYCI se genera con el motor HTML de la plantilla oficial; los anchors del motor
    // antiguo usan claves del formato anterior, que se conservan como legado.
    const { LEGACY_FIELD_KEYS } = require('../../lib/kyciMasterSpec.cjs');
    const schemaKeys = new Set([
      ...schemas.listSchemaFieldKeys(schemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA),
      ...LEGACY_FIELD_KEYS,
    ]);
    for (const anchor of kyci.anchors) {
      assert.ok(
        schemaKeys.has(anchor.data_key),
        `data_key ${anchor.data_key} falta en esquema cliente`
      );
    }
  });

  it('mapeo de campos alineado con templates_config KYCE', () => {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../../templates/templates_config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const kyce = config.cumplimiento_entidades;
    assert.ok(kyce?.anchors?.length);
    // KYCE se genera con el motor HTML de la plantilla oficial; los anchors del motor
    // antiguo usan claves del formato anterior, que se conservan como legado.
    const schemaKeys = new Set([
      ...schemas.listSchemaFieldKeys(schemas.CUMPLIMIENTO_ENTIDADES_SCHEMA),
      ...require('../../lib/kyceMasterSpec.cjs').LEGACY_FIELD_KEYS,
    ]);
    for (const anchor of kyce.anchors) {
      assert.ok(
        schemaKeys.has(anchor.data_key),
        `data_key ${anchor.data_key} falta en esquema KYCE`
      );
    }
  });
});
