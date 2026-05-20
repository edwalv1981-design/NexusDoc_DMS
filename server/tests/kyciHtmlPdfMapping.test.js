'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildKyciPdfInnerHtml } = require('../services/kyciHtmlPdfService');
const { getKyciPdfDict } = require('../services/kyciPdfI18n');

const sampleData = {
  firstName: 'María',
  secondName: 'Elena',
  lastName: 'González',
  birthDate: '1985-03-15',
  birthPlace: 'Panamá',
  maritalStatus: 'Casado(a)',
  nationality: 'Panamá',
  passport: 'PA123456',
  idCard: '8-888-888',
  phone: '+507 6000-0000',
  email: 'maria@test.com',
  address: 'Calle 50',
  city: 'Panamá',
  country: 'Panamá',
  occupation: 'Abogada',
  employer: 'Estudio Legal SA',
  pep: 'No',
  fundsSource: ['Bienes personales', 'Negocios'],
  fundsOther: '',
  declarationName: 'María Elena González',
  declarationDate: '2026-05-19',
};

describe('kyciHtmlPdfMapping', () => {
  it('incluye secciones y datos personales en HTML', () => {
    const t = getKyciPdfDict('es');
    const html = buildKyciPdfInnerHtml(sampleData, { language: 'es' });
    assert.match(html, /PTL_KYC/);
    assert.match(html, new RegExp(escRegex(t.sectionPersonal)));
    assert.match(html, new RegExp(escRegex(t.sectionContact)));
    assert.match(html, new RegExp(escRegex(t.sectionCompliance)));
    assert.match(html, /María/);
    assert.match(html, /González/);
    assert.match(html, /maria@test\.com/);
  });

  it('marca origen de fondos seleccionados', () => {
    const html = buildKyciPdfInnerHtml(sampleData, { language: 'es' });
    assert.match(html, /\[X\].*Bienes personales/s);
    assert.match(html, /\[X\].*Negocios/s);
    assert.match(html, /\[ \].*Pr.stamos/s);
  });

  it('genera etiquetas en inglés', () => {
    const t = getKyciPdfDict('en');
    const html = buildKyciPdfInnerHtml(sampleData, { language: 'en' });
    assert.match(html, new RegExp(escRegex(t.sectionPersonal)));
    assert.match(html, /Personal assets/);
  });
});

function escRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
