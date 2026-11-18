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
    const opt = kyceMaster.APPLICANT_TYPE_OPTIONS.find((o) => o.key === k);
    return `<span class="arrow">&#10148;</span> <b>${esc(opt[L])}</b>`;
  };
  const docs = (k, field) => (sel(k) && Array.isArray(data[field]) ? data[field] : []);
  const docCell = (opts, selected, keys) =>
    `<td class="docs-cell">${keys
      .map((key) => {
        const opt = opts.find((o) => o.key === key);
        return `<div class="doc">${box(selected.includes(key))} ${esc(opt[L])}</div>`;
      })
      .join('')}</td>`;
  const note = (text) =>
    `<tr><td colspan="4" class="note"><b><u>${esc(t.noteLabel)}</u>:</b> ${esc(text)}</td></tr>`;

  const privDocs = docs('privateCompany', 'privateDocs');
  const trustDocs = docs('trustFoundation', 'trustDocs');
  const partDocs = docs('partnership', 'partnershipDocs');
  const fatca = data.fatcaClassification || '';
  const fatcaLine = (key, extraLabel, extraValue) => {
    const opt = kyceMaster.FATCA_OPTIONS.find((o) => o.key === key);
    return `<div class="line fatca"><span class="fatca-opt">${esc(opt[L])}:</span> ${box(fatca === key)}${
      extraLabel ? ` <span class="fatca-extra">${esc(extraLabel)} ${val(fatca === key ? extraValue : '')}</span>` : ''
    }</div>`;
  };
  const sigRow = (name, date) => `
      <tr>
        <td class="lbl">${esc(t.signature)}</td>
        <td class="sig-box">${name ? `<span class="sig-name">${esc(name)}</span>` : '&nbsp;'}</td>
        <td class="date-lbl">${esc(t.declarationDate)}</td>
        <td class="date-val">${date ? val(fmtDate(date)) : '<b>&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/</b>'}</td>
      </tr>`;

  return `
    <header class="doc-header">
      <div class="title">${esc(t.docTitle).replace('\n', '<br/>')}</div>
      <div class="subtitle">${esc(t.docSubtitle)}</div>
    </header>
    <div class="entity-line">${esc(t.panamaEntityName)} ${val(data.panamaEntityName)}</div>

    <table class="frm"><colgroup><col style="width:24%"/><col style="width:25%"/><col style="width:25%"/><col style="width:26%"/></colgroup><tbody>
      <tr><td colspan="4"><div class="b">${esc(t.intro)}</div><div class="line">${esc(t.introNote)}</div></td></tr>
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
        <td colspan="3">
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

    <table class="frm page2"><colgroup><col style="width:24%"/><col style="width:25%"/><col style="width:25%"/><col style="width:26%"/></colgroup><tbody>
      <tr>
        <td class="lbl" rowspan="2">${typeLabel('privateCompany')}</td>
        <td colspan="3" class="attach">${esc(t.pleaseAttach)}</td>
      </tr>
      <tr class="docs-row">
        ${docCell(kyceMaster.PRIVATE_DOC_OPTIONS, privDocs, ['certIncorporation', 'registerDirectors'])}
        ${docCell(kyceMaster.PRIVATE_DOC_OPTIONS, privDocs, ['certGoodStanding', 'registerMembers'])}
        ${docCell(kyceMaster.PRIVATE_DOC_OPTIONS, privDocs, ['latestAccounts', 'ownershipChart'])}
      </tr>
      ${note(t.privateNote)}
      <tr>
        <td class="lbl" rowspan="2">${typeLabel('trustFoundation')}<div class="benef">${esc(t.beneficiaries)}</div></td>
        <td colspan="3" class="attach">${esc(t.pleaseAttach)}</td>
      </tr>
      <tr class="docs-row">
        ${docCell(kyceMaster.TRUST_DOC_OPTIONS, trustDocs, ['trustDeed'])}
        ${docCell(kyceMaster.TRUST_DOC_OPTIONS, trustDocs, ['certRegistration'])}
        ${docCell(kyceMaster.TRUST_DOC_OPTIONS, trustDocs, ['dueDiligence'])}
      </tr>
      <tr><td class="lbl">${esc(t.settlorNameAddress)}</td><td colspan="3">${val(tv('trustFoundation', 'settlorNameAddress'))}</td></tr>
      <tr><td class="lbl">${esc(t.trusteesNameAddress)}</td><td colspan="3">${val(tv('trustFoundation', 'trusteesNameAddress'))}</td></tr>
      <tr><td class="lbl">${esc(t.enforcerNameAddress)}</td><td colspan="3">${val(tv('trustFoundation', 'enforcerNameAddress'))}</td></tr>
      <tr><td class="lbl">${esc(t.protectorNameAddress)}</td><td colspan="3">${val(tv('trustFoundation', 'protectorNameAddress'))}</td></tr>
      ${[1, 2, 3, 4]
        .map((n) => `<tr><td class="lbl">${esc(t.beneficiary)}</td><td colspan="3">${val(tv('trustFoundation', `beneficiary${n}`))}</td></tr>`)
        .join('')}
      ${note(t.trustNote)}
      <tr>
        <td class="lbl" rowspan="2">${typeLabel('partnership')}</td>
        <td colspan="3" class="attach">${esc(t.pleaseAttach)}</td>
      </tr>
      <tr class="docs-row">
        ${docCell(kyceMaster.PARTNERSHIP_DOC_OPTIONS, partDocs, ['partnershipDeed', 'authorisedPersons'])}
        ${docCell(kyceMaster.PARTNERSHIP_DOC_OPTIONS, partDocs, ['latestAccounts', 'certRegistration'])}
        ${docCell(kyceMaster.PARTNERSHIP_DOC_OPTIONS, partDocs, ['registerPartners'])}
      </tr>
      ${note(t.partnershipNote)}
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

    <table class="frm tax"><colgroup><col style="width:24%"/><col style="width:76%"/></colgroup><tbody>
      <tr>
        <td class="lbl mid">${esc(t.taxResidencyLabel)}</td>
        <td>
          <div class="q"><span class="qn">A.</span> ${esc(t.usEntity)}</div>
          <div class="ind">${yesNo(data.usEntity, t)}</div>
          <div class="ind">${esc(t.einPrompt)}</div>
          <div class="ind">${esc(t.einNumber)} ${val(data.einNumber)}</div>
          <div class="q"><span class="qn">B.</span> ${esc(t.otherTaxResidence)}</div>
          <div class="ind">${yesNo(data.otherTaxResidence, t)}</div>
          <div class="ind">${esc(t.otherTaxResidenceDetails)} ${multiline(data.otherTaxResidenceDetails)}</div>
          <div class="ind">${esc(t.taxIdNumber)} ${val(data.taxIdNumber)}</div>
        </td>
      </tr>
      <tr><td colspan="2" class="note"><b><u>${esc(t.noteLabel)}:</u></b> ${esc(t.selfCertNote)}</td></tr>
      <tr><td colspan="2" class="spacer">&nbsp;</td></tr>
      <tr><td colspan="2">${esc(t.declaration)}</td></tr>
    </tbody></table>
    <table class="frm sign"><colgroup><col style="width:32%"/><col style="width:28%"/><col style="width:15%"/><col style="width:25%"/></colgroup><tbody>
      ${sigRow(data.declarationName, data.declarationDate)}
      ${sigRow(data.declarationName2, data.declarationDate2)}
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
      const inner = buildKycePdfInnerHtml(data, { language: lang });

      const html =
        '<!DOCTYPE html><html lang="' +
        lang +
        '"><head><meta charset="utf-8" /><style>' +
        `
    @page { size: A4; }
    * { box-sizing: border-box; }
    body { font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 9.5px; color: #0f172a; margin: 0; padding: 0; }
    .doc-header { text-align: right; margin-bottom: 8px; }
    .doc-header .title { font-weight: 700; font-size: 12px; }
    .doc-header .subtitle { font-weight: 700; font-size: 12px; margin-top: 2px; }
    .entity-line { margin: 4px 0 10px; }
    .b { font-weight: 700; }
    .frm { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .frm td { border: 1px solid #4b2e83; padding: 4px 6px; vertical-align: top; }
    .frm .mid { vertical-align: middle; }
    .frm + .frm td { }
    .tall { height: 36px; }
    .line { margin: 3px 0; }
    .sp { margin-top: 10px; }
    .gap { margin-left: 24px; }
    .box { display: inline-block; position: relative; width: 10px; height: 10px; line-height: 0; border: 1px solid #000; font-size: 0; color: transparent; overflow: hidden; vertical-align: middle; margin: 0 3px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .box.on { background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><path d='M1 1L7 7M7 1L1 7' stroke='%23000' stroke-width='1.3' stroke-linecap='round'/></svg>") center / 100% 100% no-repeat; }
    .yn { margin-right: 10px; white-space: nowrap; }
    .val { font-weight: 700; color: #0f172a; }
    .ml { white-space: pre-wrap; margin: 2px 0 4px; }
    .arrow { font-size: 9px; }
    .benef { margin-top: 26px; }
    .attach { border-bottom: none !important; }
    .docs-row td { border-top: none; }
    .docs-cell .doc { margin: 2px 0 10px; }
    .note { font-size: 9.5px; }
    .fatca-opt { display: inline-block; width: 80px; }
    .fatca-extra { margin-left: 20px; }
    .q { margin: 3px 0; }
    .qn { display: inline-block; width: 16px; }
    .ind { margin: 3px 0 3px 16px; }
    .spacer { height: 14px; }
    .tax, .page2 { }
    .page2 { page-break-before: always; }
    .sign td { border-top: none; vertical-align: middle; }
    .sign .sig-box { height: 46px; }
    .sign .sig-name { font-weight: 700; font-size: 11px; color: #0f172a; }
    tr { page-break-inside: avoid; }
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
      const headerTemplate = logoDataUri
        ? `<div style="font-size:10px;width:100%;padding:6px 14mm 0 14mm;text-align:left;"><img src="${logoDataUri}" style="height:36px;width:auto;display:block;" /></div>`
        : '<div style="font-size:1px;">&nbsp;</div>';
      const footerTemplate = '<div style="font-size:1px;">&nbsp;</div>';

      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        scale: 1,
        margin: { top: '20mm', bottom: '12mm', left: '14mm', right: '14mm' },
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
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
