'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildKycePdfInnerHtml } = require('../services/kyceHtmlPdfService');
const { getKycePdfDict } = require('../services/kycePdfI18n');

const sampleData = {
  legalName: 'Inversiones Globales S.A.',
  tradeName: 'Globales Corp',
  entityType: 'S.A.',
  incorporationDate: '2010-06-01',
  jurisdiction: 'Panamá',
  taxId: '155612345-2-2020',
  registrationNumber: '12345',
  registeredAddress: 'Calle 50, Torre Global',
  phone: '+507 300-0000',
  email: 'kyc@globales.test',
  city: 'Panamá',
  country: 'Panamá',
  businessActivity: 'Inversiones y gestión de activos',
  website: 'https://globales.test',
  legalRepName: 'Carlos Méndez',
  legalRepId: '8-888-999',
  legalRepNationality: 'Panamá',
  beneficialOwners: 'Carlos Méndez 60%; Ana López 40%',
  pep: 'No',
  fundsSource: ['Bienes de la entidad', 'Ingresos por negocios'],
  fundsOther: '',
  declarationName: 'Carlos Méndez',
  declarationDate: '2026-05-19',
};

describe('kyceHtmlPdfMapping', () => {
  it('incluye secciones y datos de entidad en HTML', () => {
    const t = getKycePdfDict('es');
    const html = buildKycePdfInnerHtml(sampleData, { language: 'es' });
    assert.match(html, new RegExp(escRegex(t.sectionEntity)));
    assert.match(html, new RegExp(escRegex(t.sectionContact)));
    assert.match(html, new RegExp(escRegex(t.sectionRepresentatives)));
    assert.match(html, /Inversiones Globales/);
    assert.match(html, /kyc@globales\.test/);
  });

  it('marca origen de fondos seleccionados', () => {
    const html = buildKycePdfInnerHtml(sampleData, { language: 'es' });
    assert.match(html, /\[X\].*Bienes de la entidad/s);
    assert.match(html, /\[X\].*Ingresos por negocios/s);
    assert.match(html, /\[ \].*Pr.stamos/s);
  });

  it('genera etiquetas en inglés', () => {
    const t = getKycePdfDict('en');
    const html = buildKycePdfInnerHtml(sampleData, { language: 'en' });
    assert.match(html, new RegExp(escRegex(t.sectionEntity)));
    assert.match(html, /Entity assets/);
  });
});

function escRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
