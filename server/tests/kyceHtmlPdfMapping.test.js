'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildKycePdfInnerHtml } = require('../services/kyceHtmlPdfService');
const { getKycePdfDict } = require('../services/kycePdfI18n');

const sampleData = {
  panamaEntityName: 'Inversiones Atlántico S.A.',
  applicantRoles: ['shareholder', 'member'],
  legalName: 'Atlantic Holdings Ltd.',
  incorporationDate: '2015-06-01',
  jurisdiction: 'BVI',
  registrationNumber: 'BVI-123',
  registeredAddress: 'Road Town',
  mailingAddress: 'PO Box 1',
  phone: '+1 284 000',
  businessActivity: 'Tenedora de inversiones',
  offenceConvicted: 'No',
  offenceInvestigation: 'Sí',
  offenceInvestigationDetails: 'Consulta archivada',
  applicantType: 'trustFoundation',
  trustDocs: ['trustDeed', 'dueDiligence'],
  settlorNameAddress: 'Juan Pérez, Quito',
  trusteesNameAddress: 'Trust Co.',
  beneficiary1: 'María Pérez, Quito\nJosé Pérez, Guayaquil',
  stockExchange: 'NO DEBE SALIR',
  fatcaClassification: 'registeredFFI',
  fatcaGiin: 'GIIN-998877',
  usEntity: 'No',
  otherTaxResidence: 'Sí',
  otherTaxResidenceDetails: 'Ecuador',
  taxIdNumber: '1790000000001',
  declarationName: 'Pedro Ruiz',
  declarationDate: '2026-11-15',
  declarationName2: 'Laura Mena',
  declarationDate2: '2026-11-16',
  dataConsent: 'Sí',
};

const BOX_ON = '<span class="box on">X</span>';
const BOX_OFF = '<span class="box">&nbsp;</span>';
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('kyceHtmlPdfMapping (plantilla oficial)', () => {
  for (const lang of ['en', 'es']) it(`bloques en el orden de la plantilla (${lang})`, () => {
    const t = getKycePdfDict(lang);
    const html = buildKycePdfInnerHtml(sampleData, { language: lang });
    const order = [
      t.docTitle.split('\n')[0], t.docSubtitle, t.panamaEntityName, t.intro, t.legalName, t.incorporationDate,
      t.jurisdiction, t.registrationNumber, t.registeredAddress, t.mailingAddress, t.phone, t.businessActivity,
      t.offencesLabel, t.applicantIsA, t.stockExchange, t.regulatorName, t.governmentEntityType, t.bankAccountLabel,
      t.privateNote, t.settlorNameAddress, t.beneficiary, t.trustNote, t.fatcaLabel, t.taxResidencyLabel,
      t.declaration, t.representativeName, t.signature,
    ];
    let pos = -1;
    for (const label of order) {
      const idx = html.indexOf(label, pos + 1);
      assert.ok(idx > pos, `"${label.slice(0, 40)}" fuera de orden o ausente`);
      pos = idx;
    }
    assert.equal(html.split(t.signature).length - 1, 2, 'dos recuadros de firma');
    assert.doesNotMatch(html, /class="notes"/, 'sin notas al final');
    assert.ok(!html.includes(t.notes[0]), 'sin notas al final');
    // Plantilla 2026-11: sin sección Partnerships ni nota de autocertificación.
    assert.ok(!html.includes(t.partnershipNote), 'sin Partnerships');
    assert.doesNotMatch(html, /Self Certification|Autocertificación/);
  });

  it('imprime los datos y marca casillas', () => {
    const html = buildKycePdfInnerHtml(sampleData, { language: 'en' });
    for (const v of ['Inversiones Atlántico S.A.', 'Atlantic Holdings Ltd.', '01/06/2015', 'Consulta archivada', 'Juan Pérez, Quito', 'María Pérez', 'José Pérez, Guayaquil', 'GIIN-998877', '1790000000001', '15/11/2026', '16/11/2026', 'Pedro Ruiz / Laura Mena']) {
      assert.ok(html.includes(v), `falta ${v}`);
    }
    assert.match(html, new RegExp(`${esc(BOX_ON)} Copy of Trust Deed`));
    assert.match(html, new RegExp(`${esc(BOX_OFF)} Copy of Certificate of Registration \\(If Applicable\\)`));
    assert.match(html, new RegExp(`${esc(BOX_ON)}<span class="role-txt">Shareholder`));
    assert.match(html, new RegExp(`${esc(BOX_ON)}<span class="role-txt">Member`));
    assert.match(html, new RegExp(`${esc(BOX_OFF)}<span class="role-txt">Director`));
    assert.match(html, new RegExp(`class="declaration">${esc(BOX_ON)} I acknowledge and authorize`));
    assert.doesNotMatch(html, /Certified copy/);
    assert.match(html, new RegExp(`Registered FFI:</span> ${esc(BOX_ON)}`));
    assert.match(html, new RegExp(`Passive NFFE:</span> ${esc(BOX_OFF)}`));
  });

  it('solo imprime los datos del tipo de solicitante elegido', () => {
    const html = buildKycePdfInnerHtml(sampleData, { language: 'en' });
    assert.doesNotMatch(html, /NO DEBE SALIR/);
  });

  it('dos filas de firma "Signature of person authorised…" con su fecha (plantilla 2026-11)', () => {
    const es = buildKycePdfInnerHtml(sampleData, { language: 'es' });
    const en = buildKycePdfInnerHtml(sampleData, { language: 'en' });
    assert.equal(es.split('<td class="lbl">Firma de la persona autorizada para firmar por y en nombre del Solicitante</td>').length - 1, 2);
    assert.equal(en.split('<td class="lbl">Signature of person authorised to sign for and on behalf of the Applicant</td>').length - 1, 2);
    assert.match(en, /<td class="sig-box">&nbsp;<\/td>\s*<td class="date-lbl">[^<]*<\/td>\s*<td class="date-val"><span class="val">15\/11\/2026/);
    assert.match(en, /<td class="sig-box">&nbsp;<\/td>\s*<td class="date-lbl">[^<]*<\/td>\s*<td class="date-val"><span class="val">16\/11\/2026/);
  });

  it('empresa privada: documentos nuevos y cuenta bancaria / carta de abogado', () => {
    const html = buildKycePdfInnerHtml({ applicantType: 'privateCompany', privateDocs: ['registeredAddressCert'], privateBankDocs: ['attorneyLetter'] }, { language: 'en' });
    assert.match(html, new RegExp(`${esc(BOX_ON)} Copy of registered address certification or Utility bill`));
    assert.match(html, new RegExp(`${esc(BOX_OFF)} Copy of Bank statement or Bank certificate`));
    assert.match(html, new RegExp(`${esc(BOX_ON)} Attorney or Accountant reference letter`));
    assert.match(html, /Copy of Register of Directors and officers/);
    assert.doesNotMatch(html, /latest report and accounts/, 'no se muestra si el trámite no lo marcó');
  });

  it('trámites del formato anterior conservan Partnerships, 4 beneficiarios y estados financieros', () => {
    const part = buildKycePdfInnerHtml({ applicantType: 'partnership', partnershipDocs: ['partnershipDeed'] }, { language: 'en' });
    assert.match(part, /Partnerships/);
    assert.match(part, new RegExp(`${esc(BOX_ON)} Certified copy of Partnership Deed`));
    const trust = buildKycePdfInnerHtml({ applicantType: 'trustFoundation', beneficiary1: 'B1', beneficiary2: 'B2', beneficiary4: 'B4' }, { language: 'en' });
    for (const b of ['B1', 'B2', 'B4']) assert.ok(trust.includes(b), `falta ${b}`);
    const priv = buildKycePdfInnerHtml({ applicantType: 'privateCompany', privateDocs: ['latestAccounts'] }, { language: 'en' });
    assert.match(priv, new RegExp(`${esc(BOX_ON)} Certified copy of latest report and accounts`));
  });

  it('PDF en español cuando se pide en español', () => {
    const html = buildKycePdfInnerHtml(sampleData, { language: 'es' });
    for (const txt of ['FORMULARIO DE CUMPLIMIENTO', 'Procedimiento Conozca a su Cliente', 'Si el Solicitante es:', 'Delitos y sanciones',
      'Copia de la Escritura o Declaración de Fideicomiso', 'Clasificación FATCA/CRS', 'Residencia fiscal', 'Reconozco y autorizo']) {
      assert.ok(html.includes(txt), `falta "${txt}"`);
    }
    assert.match(html, new RegExp(`Sí ${esc(BOX_ON)}</span><span class="yn">No ${esc(BOX_OFF)}`));
    assert.doesNotMatch(html, /COMPLIANCE FORM|Signature of person/);
  });

  it('trámites antiguos siguen generando PDF', () => {
    const html = buildKycePdfInnerHtml({ legalName: 'Vieja S.A.', entityType: 'S.A.', pep: 'No', fundsSource: ['Negocios'], declarationName: 'X' }, { language: 'es' });
    assert.ok(html.includes('Vieja S.A.'));
  });

  it('escapa HTML de los datos del usuario', () => {
    const html = buildKycePdfInnerHtml({ ...sampleData, legalName: '<script>x</script>' }, { language: 'es' });
    assert.doesNotMatch(html, /<script>/);
  });
});
