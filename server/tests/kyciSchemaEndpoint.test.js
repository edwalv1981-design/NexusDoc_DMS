'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../services/templateFieldSchemaService');
const pdfFormSchemas = require('../config/pdfFormSchemas');

describe('KYCI schema API (getMergedSchemaResponse)', () => {
  it('devuelve campos del PDF subido cuando hay AcroForm en BD', async () => {
    const staticSchema = pdfFormSchemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA;
    const acroFields = [
      { name: 'Cliente_Nombre_Completo', type: 'Text' },
      { name: 'Cliente_Documento_ID', type: 'Text' },
      { name: 'Cliente_Email', type: 'Text' },
    ];
    const mockModel = {
      findOne: async () => ({
        toJSON: () => ({
          templateName: 'cumplimiento_individual',
          acroFields,
          fieldMapping: {},
        }),
      }),
    };

    const merged = await svc.getMergedSchemaResponse(mockModel, 'Cumplimiento Individual');
    assert.ok(merged);
    assert.equal(merged.schemaSource, 'uploaded_pdf');
    assert.equal(merged.acroFieldCount, 3);
    const keys = pdfFormSchemas.listSchemaFieldKeys(merged.schema);
    assert.ok(keys.includes('clienteNombreCompleto'));
    assert.ok(keys.includes('clienteDocumentoId'));
    assert.ok(!keys.includes('companyName'));
    const firstField = merged.schema.steps[0].fields[0];
    assert.ok(firstField.label);
  });

  it('acepta alias cumplimiento_individual y KYCI en formType', async () => {
    const mockModel = { findOne: async () => null };
    const a = await svc.getMergedSchemaResponse(mockModel, 'cumplimiento_individual');
    const b = await svc.getMergedSchemaResponse(mockModel, 'KYCI');
    assert.ok(a?.schema);
    assert.ok(b?.schema);
    assert.equal(a.formType, 'Cumplimiento Individual');
    assert.equal(b.formType, 'Cumplimiento Individual');
  });

  it('mergeSchemas prioriza uploaded cuando hay AcroForm', () => {
    const staticSchema = pdfFormSchemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA;
    const uploaded = svc.buildDynamicSchema(
      'cumplimiento_individual',
      [{ name: 'Campo_Custom_PDF', type: 'Text' }],
      null
    );
    const { schema, schemaSource } = svc.mergeSchemas(staticSchema, uploaded, 1);
    assert.equal(schemaSource, 'uploaded_pdf');
    assert.ok(pdfFormSchemas.listSchemaFieldKeys(schema).includes('campoCustomPdf'));
    assert.ok(!pdfFormSchemas.listSchemaFieldKeys(schema).includes('firstName'));
  });
});
