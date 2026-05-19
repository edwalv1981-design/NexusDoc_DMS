'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../services/templateFieldSchemaService');
const pdfFormSchemas = require('../config/pdfFormSchemas');

describe('templateFieldSchemaService', () => {
  it('acroNameToFormKey normaliza nombres AcroForm', () => {
    assert.equal(svc.acroNameToFormKey('first_name'), 'firstName');
    assert.equal(svc.acroNameToFormKey('LastName'), 'lastName');
  });

  it('inferFieldType detecta fecha y email por patrón', () => {
    assert.equal(svc.inferFieldType('birthDate', { type: 'Text' }), 'date');
    assert.equal(svc.inferFieldType('email', { type: 'Text' }), 'email');
    assert.equal(svc.inferFieldType('pep', { type: 'Text' }), 'select');
  });

  it('buildFieldMapping alinea claves estáticas KYCI con AcroForm', () => {
    const staticSchema = pdfFormSchemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA;
    const acroFields = [
      { name: 'firstName', type: 'Text' },
      { name: 'lastName', type: 'Text' },
      { name: 'passport', type: 'Text' },
    ];
    const mapping = svc.buildFieldMapping(acroFields, staticSchema);
    assert.equal(mapping.firstName, 'firstName');
    assert.equal(mapping.lastName, 'lastName');
    assert.equal(mapping.passport, 'passport');
  });

  it('buildDynamicSchema agrupa campos en pasos', () => {
    const staticSchema = pdfFormSchemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA;
    const acroFields = [
      { name: 'firstName', type: 'Text' },
      { name: 'email', type: 'Text' },
      { name: 'pep', type: 'Text' },
    ];
    const dynamic = svc.buildDynamicSchema('cumplimiento_individual', acroFields, staticSchema);
    assert.ok(dynamic.steps.length >= 2);
    const keys = pdfFormSchemas.listSchemaFieldKeys(dynamic);
    assert.ok(keys.includes('firstName'));
    assert.ok(keys.includes('email'));
  });

  it('mergeSchemas usa estático si no hay campos subidos', () => {
    const staticSchema = pdfFormSchemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA;
    const { schema, schemaSource } = svc.mergeSchemas(staticSchema, null, 0);
    assert.equal(schemaSource, 'static');
    assert.equal(schema, staticSchema);
  });
});
