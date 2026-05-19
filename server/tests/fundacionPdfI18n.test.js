'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../services/fundacionPdfI18n');

describe('fundacionPdfI18n', () => {
  it('ES y EN tienen exactamente las mismas claves (parity)', () => {
    assert.doesNotThrow(() => i18n.assertFundacionPdfI18nParity());
  });

  it('normalizeLanguage convierte basura a "es"', () => {
    assert.equal(i18n.normalizeLanguage(undefined), 'es');
    assert.equal(i18n.normalizeLanguage('xx'), 'es');
  });

  it('getFundacionPdfDict devuelve el diccionario correcto', () => {
    const es = i18n.getFundacionPdfDict('es');
    const en = i18n.getFundacionPdfDict('en');
    assert.equal(es.docTitle, 'Formulario de Fundación de Interés Privado');
    assert.equal(en.docTitle, 'Private Interest Foundation Form');
    assert.equal(es.sectionProtectors, 'Protectores');
    assert.equal(en.sectionProtectors, 'Protectors');
  });

  it('ningún valor del diccionario es bilingüe (sin " / ")', () => {
    for (const lang of ['es', 'en']) {
      const dict = i18n.getFundacionPdfDict(lang);
      for (const [k, v] of Object.entries(dict)) {
        assert.equal(v.includes(' / '), false, `[${lang}] ${k} contiene patrón bilingüe`);
      }
    }
  });
});
