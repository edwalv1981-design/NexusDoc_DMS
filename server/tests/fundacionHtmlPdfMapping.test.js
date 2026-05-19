const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFundacionPdfInnerHtml } = require('../services/fundacionHtmlPdfService');

const sampleData = {
  foundationNameOption1: 'FUNDACIÓN PRUEBA',
  initialPatrimony: '25000',
  founders: [
    {
      firstName: 'Juan',
      secondName: 'Carlos',
      lastName: 'Pérez',
      birthDate: '1980-05-01',
      nationality: 'Panamá',
      passport: 'PA123',
      address: 'Calle 50',
      city: 'Panamá',
      country: 'Panamá',
    },
  ],
  protectors: [
    {
      firstName: 'Ana',
      lastName: 'Gómez',
      birthDate: '1975-03-10',
      passport: 'PA456',
      address: 'Via España',
    },
  ],
  councilMembers: [
    {
      firstName: 'Luis',
      lastName: 'Martínez',
      birthDate: '1970-01-15',
      maritalStatus: 'Casado',
      nationality: 'Panamá',
      passport: 'PA789',
      address: 'Bella Vista',
      city: 'Panamá',
      country: 'Panamá',
    },
  ],
  dignitaries: [
    { role: 'PRESIDENTE', fullName: 'Luis Martínez', birthDate: '1970-01-15', address: 'Bella Vista' },
  ],
  beneficiaries: [
    { percentage: '100', shareholder: 'Ana Gómez', birthDate: '1975-03-10', address: 'Via España' },
  ],
  poaIssue: 'YES',
  poaType: 'GENERAL',
  poaValidityDate: 'Indefinida',
  poaLegalized: 'NO',
  poaFirstName: 'Pedro',
  poaLastName: 'Ramos',
  poaEmail: 'pedro@test.com',
  foundationObjects: 'Planificación patrimonial familiar.',
  declarationName: 'Juan Carlos Pérez',
  declarationDate: '2026-05-19',
};

test('buildFundacionPdfInnerHtml includes all major sections', () => {
  const html = buildFundacionPdfInnerHtml(sampleData, { language: 'es' });
  assert.match(html, /Juan/);
  assert.match(html, /Pérez/);
  assert.match(html, /Ana Gómez/);
  assert.match(html, /Luis Martínez/);
  assert.match(html, /Pedro/);
  assert.match(html, /Planificación patrimonial/);
  assert.match(html, /FUNDACIÓN PRUEBA/);
});

test('buildFundacionPdfInnerHtml maps legacy fullName founder', () => {
  const html = buildFundacionPdfInnerHtml(
    {
      founders: [{ fullName: 'María López', birthDate: '1990-02-02', address: 'Calle 1' }],
    },
    { language: 'es' }
  );
  assert.match(html, /María/);
  assert.match(html, /López/);
});
