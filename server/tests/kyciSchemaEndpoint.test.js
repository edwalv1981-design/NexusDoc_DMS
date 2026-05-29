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

    const mockDocTemplate = {
      findOne: async () => ({ uploadedBy: 'admin', fileData: Buffer.from('%PDF') }),
    };

    const merged = await svc.getMergedSchemaResponse(mockModel, 'Cumplimiento Individual', mockDocTemplate);
    assert.ok(merged);
    assert.equal(merged.schemaSource, 'uploaded_pdf');
    assert.equal(merged.acroFieldCount, 3);
    assert.equal(merged.usesStaticFallback, false);
    const keys = pdfFormSchemas.listSchemaFieldKeys(merged.schema);
    assert.ok(keys.includes('clienteNombreCompleto'));
    assert.ok(keys.includes('clienteDocumentoId'));
    assert.ok(!keys.includes('fullName'));
    assert.ok(!keys.includes('companyName'));
    const firstField = merged.schema.steps[0].fields[0];
    assert.ok(firstField.label);
  });

  it('prioriza campos custom en template_field_schemas sobre esquema estático', async () => {
    const acroFields = [
      { name: 'Campo_Aduana_001', type: 'Text' },
      { name: 'Campo_Aduana_002', type: 'Text' },
    ];
    const mockSchemaModel = {
      findOne: async () => ({
        toJSON: () => ({
          templateName: 'cumplimiento_individual',
          acroFields,
          fieldMapping: {},
          schemaSource: 'uploaded_pdf',
        }),
      }),
    };
    const mockDocTemplate = {
      findOne: async () => ({ uploadedBy: 'admin', fileData: Buffer.from('%PDF') }),
    };
    const merged = await svc.getMergedSchemaResponse(
      mockSchemaModel,
      'Cumplimiento Individual',
      mockDocTemplate
    );
    const keys = pdfFormSchemas.listSchemaFieldKeys(merged.schema);
    assert.ok(keys.includes('campoAduana001'));
    assert.ok(!keys.includes('fullName'));
    assert.equal(merged.usesStaticFallback, false);
  });

  it('resolveTemplatePdf obtiene buffer desde DocumentTemplate (producción Railway)', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 db-template');
    const mockDocTemplate = {
      findOne: async () => ({ fileData: pdfBuffer }),
    };
    const resolved = await svc.resolveTemplatePdf(mockDocTemplate, 'cumplimiento_individual');
    assert.ok(resolved);
    assert.equal(resolved.source, 'db');
    assert.equal(resolved.buffer.toString(), '%PDF-1.4 db-template');
    const exists = await svc.templateExistsForForm(mockDocTemplate, 'cumplimiento_individual');
    assert.equal(exists, true);
  });

  it('con plantilla pero 0 AcroForm no devuelve esquema estático KYCI', async () => {
    const mockSchemaModel = { findOne: async () => null };
    const mockDocTemplate = {
      findOne: async () => ({ uploadedBy: 'admin', fileData: Buffer.from('%PDF') }),
    };

    const originalRefresh = svc.refreshAcroFieldsFromTemplate;
    svc.refreshAcroFieldsFromTemplate = async () => ({
      fields: [],
      templateExists: true,
      pdfSource: 'db',
      pdfBuffer: Buffer.from('%PDF'),
      extractError: null,
    });

    try {
      const merged = await svc.getMergedSchemaResponse(
        mockSchemaModel,
        'Cumplimiento Individual',
        mockDocTemplate
      );
      assert.equal(merged.schemaSource, 'flat_pdf');
      assert.equal(merged.flatPdf, true);
      assert.equal(merged.usesStaticFallback, false);
      assert.equal(pdfFormSchemas.listSchemaFieldKeys(merged.schema).length, 0);
      assert.ok(merged.message);
    } finally {
      svc.refreshAcroFieldsFromTemplate = originalRefresh;
    }
  });

  it('acepta alias cumplimiento_individual y KYCI en formType', async () => {
    const mockModel = { findOne: async () => null };
    const mockDocTemplate = {
      findOne: async () => ({ uploadedBy: 'admin', fileData: Buffer.from('%PDF') }),
    };
    const a = await svc.getMergedSchemaResponse(mockModel, 'cumplimiento_individual', mockDocTemplate);
    const b = await svc.getMergedSchemaResponse(mockModel, 'KYCI', mockDocTemplate);
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
    const { schema, schemaSource } = svc.mergeSchemas(staticSchema, uploaded, 1, true);
    assert.equal(schemaSource, 'uploaded_pdf');
    assert.ok(pdfFormSchemas.listSchemaFieldKeys(schema).includes('campoCustomPdf'));
    assert.ok(!pdfFormSchemas.listSchemaFieldKeys(schema).includes('fullName'));
  });

  it('resolveTemplateName normaliza etiquetas con espacios', () => {
    assert.equal(svc.resolveTemplateName('Cumplimiento Individual'), 'cumplimiento_individual');
  });
});
