'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildKyciPdfInnerHtml } = require('../services/kyciHtmlPdfService');
const { getKyciPdfDict } = require('../services/kyciPdfI18n');

const sampleData = {
  panamaEntityName: 'Inversiones Atlántico S.A.',
  applicantRoles: ['shareholder', 'beneficialOwner'],
  firstName: 'María',
  secondName: 'Elena',
  lastName: 'González',
  birthDate: '1985-03-15',
  nationality: 'Panamá',
  birthPlace: 'Panamá',
  passport: 'PA123456',
  address: 'Calle 50',
  maritalStatus: 'Casado(a)',
  phone: '+507 6000-0000',
  email: 'maria@test.com',
  taxResidenceCountries: 'Panamá',
  otherTaxResidence: 'No',
  usPerson: 'No',
  sourceOfWealth: 'Salario de abogada',
  pep: 'No',
  offenceConvicted: 'No',
  offenceBankrupt: 'No',
  offenceInvestigation: 'No',
  certifiedDocs: ['passport', 'proofOfAddress', 'cv'],
  declarationDate: '2026-05-19',
};

const BOX_ON = '<span class="box on">X</span>';
const BOX_OFF = '<span class="box">&nbsp;</span>';
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('kyciHtmlPdfMapping (plantilla oficial)', () => {
  it('reproduce los bloques de la plantilla en orden', () => {
    const t = getKyciPdfDict('es');
    const html = buildKyciPdfInnerHtml(sampleData, { language: 'es' });
    const order = [
      'COMPLIANCE FORM', t.docSubtitle, t.panamaEntityName, t.introTitle, t.applicantRolesTitle,
      t.fullNameLabel, t.birthDate, t.birthPlace, t.address, t.maritalStatus, t.phone, t.email,
      t.taxResidenceCountries, t.fatcaLabel, t.sourceOfWealthLabel, t.pepLabel, t.offencesLabel,
      t.docsTitle, 'I hereby confirm', t.signature, t.declarationDate, t.notesTitle,
    ];
    let pos = -1;
    for (const label of order) {
      const idx = html.indexOf(label.replace(/&/g, '&amp;').replace(/“/g, '“'), pos + 1);
      assert.ok(idx > pos, `"${label}" fuera de orden o ausente`);
      pos = idx;
    }
  });

  it('imprime los datos del solicitante', () => {
    const html = buildKyciPdfInnerHtml(sampleData, { language: 'es' });
    for (const v of ['Inversiones Atlántico S.A.', 'María', 'Elena', 'González', '15/03/1985', 'PA123456', 'maria@test.com', 'Salario de abogada', '19/05/2026']) {
      assert.match(html, new RegExp(esc(v)));
    }
  });

  it('marca las calidades del solicitante y los documentos', () => {
    const html = buildKyciPdfInnerHtml(sampleData, { language: 'es' });
    assert.match(html, new RegExp(`${esc(BOX_ON)} Shareholder`));
    assert.match(html, new RegExp(`${esc(BOX_ON)} Beneficial Owner`));
    assert.match(html, new RegExp(`${esc(BOX_OFF)} Director`));
    assert.match(html, new RegExp(`${esc(BOX_ON)} Colour Picture Passport`));
    assert.match(html, new RegExp(`${esc(BOX_OFF)} Bank Reference`));
  });

  it('preguntas Sí/No como casillas y detalle cuando es Sí', () => {
    const htmlNo = buildKyciPdfInnerHtml(sampleData, { language: 'es' });
    assert.match(htmlNo, new RegExp(`Yes: ${esc(BOX_OFF)}</span><span class="yn">No: ${esc(BOX_ON)}`));
    assert.doesNotMatch(htmlNo, /&lt;span/);
    const htmlYes = buildKyciPdfInnerHtml({ ...sampleData, pep: 'Sí', pepDetails: 'Ex ministro', usPerson: 'Sí', usTin: '123-45' }, { language: 'es' });
    assert.match(htmlYes, new RegExp(`Yes: ${esc(BOX_ON)}`));
    assert.match(htmlYes, /Ex ministro/);
    assert.match(htmlYes, /123-45/);
  });

  it('incluye el recuadro de firma del solicitante y las notas', () => {
    const html = buildKyciPdfInnerHtml(sampleData, { language: 'en' });
    assert.match(html, /Signature of Applicant:<\/td>\s*<td class="sig-box">/);
    assert.match(html, /I certify this to be a true copy/);
  });

  it('trámites antiguos (fullName, fondos, ocupación) siguen generando PDF', () => {
    const legacy = {
      fullName: 'Juan Carlos Torres Vega', birthDate: '1980-01-01', passport: 'X1', pep: 'No',
      fundsSource: ['Negocios'], occupation: 'Ingeniero', declarationName: 'Juan Carlos Torres Vega',
    };
    const html = buildKyciPdfInnerHtml(legacy, { language: 'es' });
    assert.match(html, /First Name <span class="val">Juan<\/span>/);
    assert.match(html, /Torres Vega/);
    assert.match(html, /Negocios\. Ingeniero/);
  });

  it('escapa HTML de los datos del usuario', () => {
    const html = buildKyciPdfInnerHtml({ ...sampleData, firstName: '<script>x</script>' }, { language: 'es' });
    assert.doesNotMatch(html, /<script>/);
  });
});
