'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getKycePdfDict, normalizeLanguage, assertKycePdfI18nParity } = require('./kycePdfI18n');
const { assertKycPdfFieldRegistryParity } = require('../config/kycPdfFieldRegistry');
const kyceMaster = require('../../lib/kyceMasterSpec.cjs');
const { esc, fmtDate } = require('../utils/kycHtmlPdfShared');

function toDataUri(filePath) {
  const ext = String(path.extname(filePath) || '').toLowerCase();
  const mimeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  const mime = mimeMap[ext];
  if (!mime) return '';
  const b64 = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${b64}`;
}

const isYes = (v) => {
  const s = String(v || '').trim().toLowerCase();
  return s.startsWith('s') || s === 'yes';
};
const isNo = (v) => String(v || '').trim().toLowerCase() === 'no';

function box(checked) {
  return `<span class="box${checked ? ' on' : ''}">${checked ? 'X' : '&nbsp;'}</span>`;
}

function yesNo(value, t) {
  return `<span class="yn">${esc(t.yes)} ${box(isYes(value))}</span><span class="yn">${esc(t.no)} ${box(isNo(value))}</span>`;
}

function val(v) {
  const s = v === undefined || v === null ? '' : String(v).trim();
  return s ? `<span class="val">${esc(s)}</span>` : '';
}

function multiline(v) {
  const s = v === undefined || v === null ? '' : String(v).trim();
  return s ? `<div class="val ml">${esc(s)}</div>` : '';
}

function buildKycePdfInnerHtml(data = {}, options = {}) {
  assertKycePdfI18nParity();
  assertKycPdfFieldRegistryParity();
  const lang = normalizeLanguage(options.language || data.language);
  const t = getKycePdfDict(lang);
  const L = t.lang;
  const applicantType = data.applicantType || kyceMaster.legacyApplicantType(data.entityType);
  const sel = (k) => applicantType === k;
  // Solo se imprimen los datos del tipo de solicitante elegido.
  const tv = (k, field) => (sel(k) ? data[field] : '');
  const typeLabel = (k) => {
    const opt = [...kyceMaster.APPLICANT_TYPE_OPTIONS, ...kyceMaster.LEGACY_APPLICANT_TYPE_OPTIONS].find((o) => o.key === k);
    return `<span class="bullet"></span><b>${esc(opt[L])}</b>`;
  };
  const docs = (k, field) => (sel(k) && Array.isArray(data[field]) ? data[field] : []);
  const docCell = (opts, selected, keys) =>
    `<td class="docs-cell">${keys
      .map((key) => {
        const opt = opts.find((o) => o.key === key);
        if (!opt) return '';
        return `<div class="doc">${box(selected.includes(key))} ${esc(opt[L])}</div>`;
      })
      .join('')}</td>`;
  const note = (text) =>
    `<tr><td colspan="4" class="note"><b><u>${esc(t.noteLabel)}</u>:</b> ${esc(text)}</td></tr>`;

  const privDocs = docs('privateCompany', 'privateDocs');
  const bankDocs = docs('privateCompany', 'privateBankDocs');
  const roles = Array.isArray(data.applicantRoles) ? data.applicantRoles : [];
  const roleCells = kyceMaster.APPLICANT_ROLE_OPTIONS.map((opt) => `<td><div class="role">${box(roles.includes(opt.key))}<span class="role-txt">${esc(opt[L]).replace(/\//g, '/<wbr>')}</span></div></td>`);
  // Documentos de empresa privada: los de la plantilla + "latest accounts" solo si un trámite antiguo lo marcó.
  const privOpts = [...kyceMaster.PRIVATE_DOC_OPTIONS, ...kyceMaster.LEGACY_PRIVATE_DOC_OPTIONS];
  const privCol3 = ['registeredAddressCert', 'ownershipChart', ...(privDocs.includes('latestAccounts') ? ['latestAccounts'] : [])];
  // Beneficiarios: un solo campo; los del formato anterior (2..4) se agregan si no están ya incluidos.
  const benef1 = String(tv('trustFoundation', 'beneficiary1') || '').trim();
  const beneficiaries = [benef1, ...['beneficiary2', 'beneficiary3', 'beneficiary4']
    .map((k) => String(tv('trustFoundation', k) || '').trim())
    .filter((v) => v && !benef1.includes(v))].filter(Boolean).join('\n');
  const signerNames = [data.declarationName, data.declarationName2].map((n) => String(n || '').trim()).filter(Boolean).join(' / ');
  const trustDocs = docs('trustFoundation', 'trustDocs');
  const partDocs = docs('partnership', 'partnershipDocs');
  const fatca = data.fatcaClassification || '';
  const fatcaLine = (key, extraLabel, extraValue) => {
    const opt = kyceMaster.FATCA_OPTIONS.find((o) => o.key === key);
    return `<div class="line fatca"><span class="fatca-opt">${esc(opt[L])}:</span> ${box(fatca === key)}${
      extraLabel ? ` <span class="fatca-extra">${esc(extraLabel)} ${val(fatca === key ? extraValue : '')}</span>` : ''
    }</div>`;
  };
  const sigRow = (date) => `
      <tr>
        <td class="lbl">${esc(t.signature)}</td>
        <td class="sig-box">&nbsp;</td>
        <td class="date-lbl">${esc(t.declarationDate)}</td>
        <td class="date-val">${date ? val(fmtDate(date)) : '<b>&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/</b>'}</td>
      </tr>`;

  return `
    <header class="doc-header">
      <div class="logo">${options.logoDataUri ? `<img src="${options.logoDataUri}" alt="" />` : ''}</div>
      <div class="titles">
        <div class="title">${esc(t.docTitle).replace('\n', '<br/>')}</div>
        <div class="subtitle">${esc(t.docSubtitle)}</div>
      </div>
    </header>
    <div class="entity-line">${esc(t.panamaEntityName).replace(/\(([^)]*)\)/, '(<b>$1</b>)')} ${val(data.panamaEntityName)}</div>
    <div class="entity-rule"></div>

    <table class="frm"><colgroup><col style="width:22.7%"/><col style="width:25.8%"/><col style="width:25.8%"/><col style="width:25.7%"/></colgroup><tbody>
      <tr><td colspan="4">
        <div class="b">${esc(t.intro)}</div>
        <div class="line">${esc(t.introNote)}</div>
        <div class="b sp">${esc(t.applicantRolesTitle)}</div>
        <table class="roles-grid"><tbody><tr>${roleCells.slice(0, 5).join('')}</tr><tr>${roleCells.slice(5).join('')}</tr></tbody></table>
      </td></tr>
      <tr><td class="lbl">${esc(t.legalName)}</td><td colspan="3">${val(data.legalName)}</td></tr>
      <tr>
        <td class="lbl" rowspan="2">${esc(t.incorporationDate)}</td>
        <td colspan="3">${data.incorporationDate ? val(fmtDate(data.incorporationDate)) : esc(t.datePlaceholder)}</td>
      </tr>
      <tr><td>${esc(t.jurisdiction)}</td><td colspan="2">${val(data.jurisdiction)}</td></tr>
      <tr><td class="lbl">${esc(t.registrationNumber)}</td><td colspan="3">${val(data.registrationNumber)}</td></tr>
      <tr><td class="lbl">${esc(t.registeredAddress)}</td><td colspan="3">${val(data.registeredAddress)}</td></tr>
      <tr><td class="lbl">${esc(t.mailingAddress)}</td><td colspan="3">${val(data.mailingAddress)}</td></tr>
      <tr><td class="lbl">${esc(t.phone)}</td><td colspan="3">${val(data.phone)}</td></tr>
      <tr><td class="lbl">${esc(t.businessActivity)}</td><td colspan="3" class="tall">${multiline(data.businessActivity)}</td></tr>
      <tr>
        <td class="lbl mid">${esc(t.offencesLabel)}</td>
        <td colspan="3" class="offences">
          <div class="line">${esc(t.offenceConvicted)}</div>
          <div class="line">${yesNo(data.offenceConvicted, t)} <span class="gap">${esc(t.offenceDetails)}</span></div>
          ${multiline(data.offenceConvictedDetails)}
          <div class="line sp">${esc(t.offenceInvestigation)}</div>
          <div class="line">${yesNo(data.offenceInvestigation, t)} <span class="gap">${esc(t.offenceDetails)}</span></div>
          ${multiline(data.offenceInvestigationDetails)}
        </td>
      </tr>
      <tr><td colspan="4" class="b">${esc(t.applicantIsA)}</td></tr>
      <tr>
        <td class="lbl" rowspan="2">${typeLabel('publicCompany')}</td>
        <td>${esc(t.stockExchange)}</td><td colspan="2">${val(tv('publicCompany', 'stockExchange'))}</td>
      </tr>
      <tr><td>${esc(t.tickerSymbol)}</td><td colspan="2">${val(tv('publicCompany', 'tickerSymbol'))}</td></tr>
      <tr>
        <td class="lbl">${typeLabel('regulatedEntity')}</td>
        <td colspan="3">
          <div class="line">${yesNo(tv('regulatedEntity', 'regulatedEntity'), t)}</div>
          <div class="line">${esc(t.regulatedParentName)} ${val(tv('regulatedEntity', 'regulatedParentName'))}</div>
          <div class="line sp">${esc(t.regulatorName)} ${val(tv('regulatedEntity', 'regulatorName'))}</div>
          <div class="line">${esc(t.country)} ${val(tv('regulatedEntity', 'regulatorCountry'))}</div>
        </td>
      </tr>
      <tr>
        <td class="lbl">${typeLabel('governmentEntity')}</td>
        <td colspan="3">
          <div class="line">${yesNo(tv('governmentEntity', 'governmentEntity'), t)}</div>
          <div class="line">${esc(t.country)} ${val(tv('governmentEntity', 'governmentCountry'))}</div>
          <div class="line">${esc(t.governmentEntityType)} ${val(tv('governmentEntity', 'governmentEntityType'))}</div>
        </td>
      </tr>
    </tbody></table>

    <table class="frm block"><colgroup><col style="width:22.7%"/><col style="width:25.8%"/><col style="width:25.8%"/><col style="width:25.7%"/></colgroup><tbody>
      <tr>
        <td class="lbl lbl-top" rowspan="2">${typeLabel('privateCompany')}</td>
        <td colspan="3" class="attach">${esc(t.pleaseAttach)}</td>
      </tr>
      <tr class="docs-row">
        ${docCell(privOpts, privDocs, ['certIncorporation'])}
        ${docCell(privOpts, privDocs, ['certGoodStanding'])}
        ${docCell(privOpts, privDocs, ['registeredAddressCert'])}
      </tr>
      <tr class="docs-row docs-row2">
        <td class="lbl-cont"></td>
        ${docCell(privOpts, privDocs, ['registerDirectors'])}
        ${docCell(privOpts, privDocs, ['registerMembers'])}
        ${docCell(privOpts, privDocs, privCol3.slice(1))}
      </tr>
      <tr class="bank-row">
        <td class="lbl">${esc(t.bankAccountLabel)}</td>
        ${docCell(kyceMaster.PRIVATE_BANK_DOC_OPTIONS, bankDocs, ['bankStatement'])}
        ${docCell(kyceMaster.PRIVATE_BANK_DOC_OPTIONS, bankDocs, ['attorneyLetter'])}
        <td>&nbsp;</td>
      </tr>
      ${note(t.privateNote)}
      <tr>
        <td class="lbl" rowspan="2">${typeLabel('trustFoundation')}</td>
        <td colspan="3" class="attach">${esc(t.pleaseAttach)}</td>
      </tr>
      <tr class="docs-row">
        ${docCell(kyceMaster.TRUST_DOC_OPTIONS, trustDocs, ['trustDeed'])}
        ${docCell(kyceMaster.TRUST_DOC_OPTIONS, trustDocs, ['certRegistration'])}
        ${docCell(kyceMaster.TRUST_DOC_OPTIONS, trustDocs, ['dueDiligence'])}
      </tr>
      <tr class="name-row"><td class="lbl">${esc(t.settlorNameAddress)}</td><td colspan="3">${val(tv('trustFoundation', 'settlorNameAddress'))}</td></tr>
      <tr class="name-row"><td class="lbl">${esc(t.trusteesNameAddress)}</td><td colspan="3">${val(tv('trustFoundation', 'trusteesNameAddress'))}</td></tr>
      <tr class="name-row"><td class="lbl">${esc(t.enforcerNameAddress)}</td><td colspan="3">${val(tv('trustFoundation', 'enforcerNameAddress'))}</td></tr>
      <tr class="name-row"><td class="lbl">${esc(t.protectorNameAddress)}</td><td colspan="3">${val(tv('trustFoundation', 'protectorNameAddress'))}</td></tr>
      <tr class="name-row"><td class="lbl">${esc(t.beneficiary)}</td><td colspan="3">${multiline(beneficiaries)}</td></tr>
      ${note(t.trustNote)}
      ${sel('partnership') ? `
      <tr>
        <td class="lbl" rowspan="2">${typeLabel('partnership')}</td>
        <td colspan="3" class="attach">${esc(t.pleaseAttach)}</td>
      </tr>
      <tr class="docs-row">
        ${docCell(kyceMaster.PARTNERSHIP_DOC_OPTIONS, partDocs, ['partnershipDeed', 'authorisedPersons'])}
        ${docCell(kyceMaster.PARTNERSHIP_DOC_OPTIONS, partDocs, ['latestAccounts', 'certRegistration'])}
        ${docCell(kyceMaster.PARTNERSHIP_DOC_OPTIONS, partDocs, ['registerPartners'])}
      </tr>
      ${note(t.partnershipNote)}` : ''}
      <tr>
        <td class="lbl mid">${esc(t.fatcaLabel)}</td>
        <td colspan="3">
          ${fatcaLine('registeredFFI', t.fatcaGiin, data.fatcaGiin)}
          ${fatcaLine('sponsoredFFI', t.fatcaSponsorGiin, data.fatcaSponsorGiin)}
          ${fatcaLine('exemptFFI', t.fatcaExemptReason, data.fatcaExemptReason)}
          ${fatcaLine('activeNFFE')}
          ${fatcaLine('passiveNFFE')}
        </td>
      </tr>
    </tbody></table>

    <table class="frm block tax"><colgroup><col style="width:22.7%"/><col style="width:77.3%"/></colgroup><tbody>
      <tr>
        <td class="lbl mid">${esc(t.taxResidencyLabel)}</td>
        <td>
          <div class="q"><span class="qn">A.</span> ${esc(t.usEntity)}</div>
          <div class="ind"><span class="yn">${esc(t.yes)}: ${box(isYes(data.usEntity))}</span><span class="yn">${esc(t.no)}: ${box(isNo(data.usEntity))}</span></div>
          <div class="ind">${esc(t.einPrompt)}</div>
          <div class="ind">${esc(t.einNumber)} ${val(data.einNumber)}</div>
          <div class="q"><span class="qn">B.</span> ${esc(t.otherTaxResidence)}</div>
          <div class="ind">${yesNo(data.otherTaxResidence, t)}</div>
          <div class="ind">${esc(t.otherTaxResidenceDetails)} ${multiline(data.otherTaxResidenceDetails)}</div>
          <div class="ind">${esc(t.taxIdNumber)} ${val(data.taxIdNumber)}</div>
        </td>
      </tr>
      <tr><td colspan="2" class="declaration">${box(isYes(data.dataConsent))} ${esc(t.declaration)}</td></tr>
      <tr><td colspan="2">${esc(t.representativeName)} ${val(signerNames)}</td></tr>
    </tbody></table>
    <table class="frm block sign"><colgroup><col style="width:32%"/><col style="width:28%"/><col style="width:15%"/><col style="width:25%"/></colgroup><tbody>
      ${sigRow(data.declarationDate)}
      ${sigRow(data.declarationDate2)}
    </tbody></table>
  `;
}

class KyceHtmlPdfService {
  async generatePdf(data = {}, options = {}) {
    let browser = null;
    try {
      const rootDir = process.cwd().includes('server') ? path.join(process.cwd(), '..') : process.cwd();
      let logoDataUri = '';
      const logoPath = path.join(rootDir, 'templates', 'logo_empresa.png');
      if (fs.existsSync(logoPath)) {
        logoDataUri = toDataUri(logoPath);
      }

      const lang = normalizeLanguage(options.language || data.language);
      const inner = buildKycePdfInnerHtml(data, { language: lang, logoDataUri });

      const html =
        '<!DOCTYPE html><html lang="' +
        lang +
        '"><head><meta charset="utf-8" /><style>' +
        `
    @page { size: Letter; }
    * { box-sizing: border-box; }
    /* Plantilla original: Verdana 9 pt (DejaVu Sans en el servidor), títulos 11 pt, bordes morado oscuro #48207a, viñetas en flecha. */
    body { font-family: Verdana, 'DejaVu Sans', 'Liberation Sans', Arial, sans-serif; font-size: 9pt; line-height: 1.3; color: #000; margin: 0; padding: 0; }
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin: 0 0 6pt; }
    .doc-header .logo { padding-left: 42pt; padding-top: 7pt; }
    .doc-header .logo img { width: 108pt; height: auto; display: block; }
    .doc-header .titles { text-align: right; }
    .doc-header .title { font-weight: 700; font-size: 11pt; line-height: 1.25; }
    .doc-header .subtitle { font-weight: 700; font-size: 11pt; margin-top: 4pt; }
    .entity-line { margin: 4pt 0 0 9pt; }
    .entity-rule { height: 16pt; border-right: 1px solid #48207a; margin-bottom: 4pt; }
    .b { font-weight: 700; }
    .frm { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .frm td { border: 1px solid #48207a; padding: 2.5pt 5pt; vertical-align: top; }
    .docs-row:not(.docs-row2) td.docs-cell { border-bottom: none; }
    .name-row td { height: 23pt; }
    .lbl-top { border-bottom: none !important; }
    .lbl-cont { border-top: none !important; }
    .docs-row2 td { border-top: none; }
    .frm .mid { vertical-align: middle; }
    .block { margin-top: 12pt; }
    .tall { height: 36pt; }
    .line { margin: 4pt 0; }
    .sp { margin-top: 18pt; }
    .offences { padding-bottom: 20pt !important; }
    .gap { margin-left: 30pt; }
    .box { display: inline-block; position: relative; width: 9pt; height: 9pt; line-height: 0; border: 1px solid #000; font-size: 0; color: transparent; overflow: hidden; vertical-align: -1pt; margin: 0 3pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .box.on { background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><path d='M1 1L7 7M7 1L1 7' stroke='%23000' stroke-width='1.3' stroke-linecap='round'/></svg>") center / 100% 100% no-repeat; }
    .yn { margin-right: 6pt; white-space: nowrap; }
    .val { font-weight: 700; color: #000; }
    .ml { white-space: pre-wrap; margin: 2pt 0 3pt; }
    .bullet { display: inline-block; width: 8pt; height: 8pt; margin: 0 8pt 0 2pt; vertical-align: -1pt; background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><path d='M1 1 L9.2 5 L1 9 L3.6 5 Z' fill='%23000'/></svg>") center / 100% 100% no-repeat; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .attach { border-bottom: none !important; }
    .docs-row td { border-top: none; }
        .docs-cell .doc { margin: 8pt 0 10pt; }
    .bank-row .docs-cell .doc { margin: 2pt 0; }
    .note { font-size: 9pt; }
    .declaration { text-align: left; }
    .roles-grid { width: 100%; border-collapse: collapse; margin: 8pt 0 2pt; table-layout: fixed; }
    .roles-grid td { border: 1px solid #000; padding: 3pt 5pt; vertical-align: top; height: 22pt; }
    .role { display: flex; align-items: flex-start; gap: 1pt; }
    .role .box { flex: 0 0 auto; margin-top: 1pt; }
    .role-txt { min-width: 0; overflow-wrap: anywhere; }
    .fatca-opt { display: inline-block; width: 74pt; }
    .line.fatca { margin: 8pt 0; }
    .fatca-extra { margin-left: 14pt; }
    .q { margin: 3pt 0; }
    .qn { display: inline-block; width: 14pt; }
    .ind { margin: 7pt 0 7pt 22pt; }
    .sign td { vertical-align: middle; }
    .sign .sig-box { height: 44pt; }
    .sign tr, .roles-grid tr { page-break-inside: avoid; }
` +
        '</style></head><body>' +
        inner +
        '</body></html>';

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // Página Carta y márgenes medidos en la plantilla original.
      const pdfBytes = await page.pdf({
        format: 'Letter',
        printBackground: true,
        scale: 1,
        margin: { top: '0.5in', bottom: '0.33in', left: '0.667in', right: '0.43in' },
        displayHeaderFooter: false,
      });
      return Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);
    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = {
  buildKycePdfInnerHtml,
  generatePdf: (data, options) => new KyceHtmlPdfService().generatePdf(data, options),
};
