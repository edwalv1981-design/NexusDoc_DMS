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

const kyceSample = {
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
  it('incluye título PTL_KYC y todas las etiquetas por sección', () => {
    const t = getKyciPdfDict('es');
    const html = buildKyciPdfInnerHtml(kyciSample, { language: 'es' });
    assert.match(html, /PTL_KYC/);
    assert.match(html, /María/);
    for (const section of KYCI_PDF_SECTIONS) {
      const labels = section.fields
        .filter((key) => key !== 'pepDetails' || String(kyciSample.pep || '').trim().toLowerCase().startsWith('s'))
        .map((key) => t[key])
        .filter(Boolean);
      if (section.fundsSource) labels.push(t.fundsSource);
      assertLabelsInSection(extractSection(html, t[section.sectionKey]), labels, t[section.sectionKey]);
    }
  });
});

describe('kyceHtmlPdf field parity', () => {
  it('incluye título PTL_KYC y secciones entidad / representantes / cumplimiento', () => {
    const t = getKycePdfDict('es');
    const html = buildKycePdfInnerHtml(kyceSample, { language: 'es' });
    assert.match(html, /PTL_KYC/);
    assert.match(html, /Inversiones Globales/);
    assert.match(html, new RegExp(escRegex(t.sectionEntity)));
    assert.match(html, new RegExp(escRegex(t.sectionRepresentatives)));
    assert.match(html, new RegExp(escRegex(t.sectionCompliance)));
    for (const section of KYCE_PDF_SECTIONS) {
      const labels = section.fields
        .filter((key) => key !== 'pepDetails' || String(kyceSample.pep || '').trim().toLowerCase().startsWith('s'))
        .map((key) => t[key])
        .filter(Boolean);
      if (section.fundsSource) labels.push(t.fundsSource);
      assertLabelsInSection(extractSection(html, t[section.sectionKey]), labels, t[section.sectionKey]);
    }
  });
});
