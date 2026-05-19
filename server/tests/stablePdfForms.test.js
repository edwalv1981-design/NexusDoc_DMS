'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const s = require('../config/stablePdfForms');

describe('stablePdfForms', () => {
  it('resuelve Corporación y Fondos a plantillas esperadas', () => {
    assert.equal(s.getPdfTemplateNameForForm(s.FORM_TYPE_CORPORACION), 'corporacion');
    assert.equal(s.getPdfTemplateNameForForm(s.FORM_TYPE_FONDOS_SFAR), 'referencia_maestra');
    assert.equal(s.getPdfTemplateNameForForm(s.FORM_TYPE_FUNDACION), 'fundaciones');
    assert.equal(s.isCorporacionPdfForm(s.FORM_TYPE_CORPORACION), true);
    assert.equal(s.isCorporacionPdfForm(s.FORM_TYPE_FONDOS_SFAR), false);
    assert.equal(s.isFundacionPdfForm(s.FORM_TYPE_FUNDACION), true);
  });

  it('prefijos de descarga SFAR / PTLC', () => {
    assert.equal(s.getPdfDownloadFilenamePrefix(s.FORM_TYPE_FONDOS_SFAR), 'SFAR');
    assert.equal(s.getPdfDownloadFilenamePrefix(s.FORM_TYPE_CORPORACION), 'PTLC');
  });
});
