'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../services/corporacionPdfI18n');

describe('corporacionPdfI18n', () => {
  it('ES y EN tienen exactamente las mismas claves (parity)', () => {
    assert.doesNotThrow(() => i18n.assertCorporacionPdfI18nParity());
  });

  it('normalizeLanguage convierte basura a "es"', () => {
    assert.equal(i18n.normalizeLanguage(undefined), 'es');
    assert.equal(i18n.normalizeLanguage(null), 'es');
    assert.equal(i18n.normalizeLanguage(''), 'es');
    assert.equal(i18n.normalizeLanguage('xx'), 'es');
    assert.equal(i18n.normalizeLanguage('FR-fr'), 'es');
  });

  it('normalizeLanguage acepta es y en', () => {
    assert.equal(i18n.normalizeLanguage('es'), 'es');
    assert.equal(i18n.normalizeLanguage('en'), 'en');
    assert.equal(i18n.normalizeLanguage('ES'), 'es');
    assert.equal(i18n.normalizeLanguage('en-US'), 'en');
  });

  it('getCorporacionPdfDict devuelve el diccionario correcto', () => {
    const es = i18n.getCorporacionPdfDict('es');
    const en = i18n.getCorporacionPdfDict('en');
    assert.equal(es.docTitle, 'Formulario de Incorporación');
    assert.equal(en.docTitle, 'Incorporation Form');
    assert.equal(es.sectionOfficers, 'Dignatarios');
    assert.equal(en.sectionOfficers, 'Officers');
    assert.equal(es.sectionDirectors, 'Directores');
    assert.equal(en.sectionDirectors, 'Directors');
  });

  it('todas las claves resultan en strings no vacíos', () => {
    for (const lang of ['es', 'en']) {
      const dict = i18n.getCorporacionPdfDict(lang);
      for (const [k, v] of Object.entries(dict)) {
        assert.equal(typeof v, 'string', `[${lang}] ${k} no es string`);
        assert.notEqual(v.trim(), '', `[${lang}] ${k} está vacío`);
      }
    }
  });

  it('claves ES y EN son DISTINTAS (sanidad: prueba que sí se tradujo)', () => {
    const es = i18n.getCorporacionPdfDict('es');
    const en = i18n.getCorporacionPdfDict('en');
    const sentinelKeys = ['docTitle', 'sectionOfficers', 'sectionDirectors', 'sectionShareholders', 'rolePresident'];
    for (const k of sentinelKeys) {
      assert.notEqual(es[k], en[k], `[${k}] ES === EN — falta traducción`);
    }
  });

  it('ningún valor del diccionario es bilingüe (sin " / ")', () => {
    for (const lang of ['es', 'en']) {
      const dict = i18n.getCorporacionPdfDict(lang);
      for (const [k, v] of Object.entries(dict)) {
        if (k === 'sectionNameRule') continue; // Ignoramos este porque legítimamente incluye 'A / S'
        assert.equal(
          v.includes(' / '),
          false,
          `[${lang}] ${k} contiene patrón bilingüe: ${JSON.stringify(v)}`
        );
      }
    }
  });

  it('ES no mezcla títulos en inglés y EN no mezcla títulos en español', () => {
    const es = i18n.getCorporacionPdfDict('es');
    const en = i18n.getCorporacionPdfDict('en');
    assert.equal(es.docTitle.includes('Incorporation Form'), false);
    assert.equal(en.docTitle.includes('Formulario de Incorporación'), false);
    assert.equal(es.sectionName.includes('Name of the corporation'), false);
    assert.equal(en.sectionName.includes('Nombre de la compañía'), false);
  });
});
