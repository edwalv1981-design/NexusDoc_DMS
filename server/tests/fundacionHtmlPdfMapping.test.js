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
  poaMiddleName: 'Luis',
  poaLastName: 'Ramos',
  poaBirthDate: '1985-06-15',
  poaMaritalStatus: 'Casado',
  poaNationality: 'Panamá',
  poaPassport: 'PA111',
  poaIdCard: '8-888-888',
  poaPhone: '+507 6000-0000',
  poaEmail: 'pedro@test.com',
  poaAddress: 'Calle 80',
  poaCity: 'Panamá',
  poaCountry: 'Panamá',
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

test('buildFundacionPdfInnerHtml renders POA yes/no and all grantee fields', () => {
  const html = buildFundacionPdfInnerHtml(sampleData, { language: 'es' });
  assert.match(html, /\[X\] Sí/);
  assert.match(html, /\[ \] No/);
  assert.match(html, /¿Desea emitir un poder\?/);
  assert.match(html, /¿Requiere que el poder sea legalizado\?/);
  assert.match(html, /Indefinida/);
  assert.match(html, /GENERAL/);
  assert.match(html, /Segundo nombre/);
  assert.match(html, /Correo electrónico/);
  assert.match(html, /Ciudad/);
  assert.match(html, /País/);
});

test('buildFundacionPdfInnerHtml maps legacy POA aliases', () => {
  const html = buildFundacionPdfInnerHtml(
    {
      issuePower: 'yes',
      powerType: 'special',
      validityDate: '1 año',
      legalize: 'no',
      poaFirstName: 'Ana',
      poaLastName: 'López',
    },
    { language: 'es' }
  );
  assert.match(html, /\[X\] Sí/);
  assert.match(html, /SPECIAL|ESPECIAL/);
  assert.match(html, /1 año/);
  assert.match(html, /Ana/);
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
