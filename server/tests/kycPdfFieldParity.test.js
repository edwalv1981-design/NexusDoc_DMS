'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const pdfFormSchemas = require('../config/pdfFormSchemas');
const {
  KYCI_ALL_FIELD_KEYS,
  KYCE_ALL_FIELD_KEYS,
  KYCI_PDF_SECTIONS,
  KYCE_PDF_SECTIONS,
  assertKycPdfFieldRegistryParity,
} = require('../config/kycPdfFieldRegistry');
const { buildKyciPdfInnerHtml } = require('../services/kyciHtmlPdfService');
const { buildKycePdfInnerHtml } = require('../services/kyceHtmlPdfService');
const { getKyciPdfDict } = require('../services/kyciPdfI18n');
const { getKycePdfDict } = require('../services/kycePdfI18n');

function escRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSection(html, sectionTitle) {
  const re = new RegExp(
    `<h2>${escRegex(sectionTitle)}</h2>[\\s\\S]*?</section>`,
    'i'
  );
  const m = html.match(re);
  return m ? m[0] : '';
}

function assertLabelsInSection(sectionHtml, labels, sectionName) {
  for (const label of labels) {
    assert.match(
      sectionHtml,
      new RegExp(escRegex(label)),
      `${sectionName} debe incluir etiqueta "${label}"`
    );
  }
}

const kyciSample = {
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


describe('kycPdfFieldRegistry', () => {
  it('registry alineado con pdfFormSchemas', () => {
    assert.doesNotThrow(() => assertKycPdfFieldRegistryParity());
    assert.equal(KYCI_ALL_FIELD_KEYS.length, pdfFormSchemas.listSchemaFieldKeys(
      pdfFormSchemas.CUMPLIMIENTO_INDIVIDUAL_SCHEMA
    ).length);
    assert.equal(KYCE_ALL_FIELD_KEYS.length, pdfFormSchemas.listSchemaFieldKeys(
      pdfFormSchemas.CUMPLIMIENTO_ENTIDADES_SCHEMA
    ).length);
  });
});

describe('kyciHtmlPdf field parity', () => {
  for (const lang of ['es', 'en']) it(`cada campo de la plantilla tiene etiqueta y aparece en el PDF (${lang})`, () => {
    const t = getKyciPdfDict(lang);
    const html = buildKyciPdfInnerHtml(kyciSample, { language: lang });
    assert.ok(html.includes(t.docTitle.split('\n')[0]));
    // Campos que el PDF muestra con su propia etiqueta de la plantilla.
    const labelled = KYCI_ALL_FIELD_KEYS.filter((k) => !['applicantRoles', 'certifiedDocs', 'declarationName'].includes(k) && !/Details$/.test(k));
    for (const key of labelled) {
      assert.ok(t[key], `falta etiqueta PDF para ${key}`);
      assert.ok(html.includes(t[key].replace(/&/g, '&amp;')), `PDF debe incluir etiqueta de ${key}`);
    }
    assert.ok(html.includes(t.applicantRolesTitle));
    assert.ok(html.includes(t.docsTitle));
  });
});

describe('kyceHtmlPdf field parity', () => {
  for (const lang of ['es', 'en']) it(`cada bloque de la plantilla KYCE aparece en el PDF (${lang})`, () => {
    const t = getKycePdfDict(lang);
    const html = buildKycePdfInnerHtml({ legalName: 'Inversiones Globales S.A.' }, { language: lang });
    assert.match(html, /Inversiones Globales/);
    for (const key of ['docTitle', 'panamaEntityName', 'intro', 'legalName', 'incorporationDate', 'jurisdiction', 'registrationNumber',
      'registeredAddress', 'mailingAddress', 'phone', 'businessActivity', 'offencesLabel', 'offenceConvicted', 'offenceInvestigation',
      'applicantIsA', 'stockExchange', 'tickerSymbol', 'regulatorName', 'governmentEntityType', 'privateNote', 'settlorNameAddress',
      'trusteesNameAddress', 'enforcerNameAddress', 'protectorNameAddress', 'beneficiary', 'trustNote', 'partnershipNote',
      'fatcaLabel', 'taxResidencyLabel', 'usEntity', 'einNumber', 'otherTaxResidence', 'taxIdNumber', 'selfCertNote',
      'declaration', 'signature', 'declarationDate']) {
      const text = String(t[key]).split('\n')[0];
      assert.ok(html.includes(text.replace(/&/g, '&amp;')), `${lang}: PDF debe incluir "${key}"`);
    }
  });
});
