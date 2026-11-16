'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getKyciPdfDict, normalizeLanguage, assertKyciPdfI18nParity } = require('./kyciPdfI18n');
const { assertKycPdfFieldRegistryParity, assertKyciMasterSpecParity } = require('../config/kycPdfFieldRegistry');
const kyciMaster = require('../../lib/kyciMasterSpec.cjs');
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

const isYes = (v) => String(v || '').trim().toLowerCase().startsWith('s') || String(v || '').trim().toLowerCase() === 'yes';
const isNo = (v) => String(v || '').trim().toLowerCase() === 'no';

/** Casilla cuadrada como en la plantilla (marcada con X). */
function box(checked) {
  return `<span class="box${checked ? ' on' : ''}">${checked ? 'X' : '&nbsp;'}</span>`;
}

function yesNo(value, t) {
  return `<span class="yn">${esc(t.yes)}: ${box(isYes(value))}</span><span class="yn">${esc(t.no)}: ${box(isNo(value))}</span>`;
}

function val(v) {
  const s = v === undefined || v === null ? '' : String(v).trim();
  return s ? `<span class="val">${esc(s)}</span>` : '';
}

function multiline(v) {
  const s = v === undefined || v === null ? '' : String(v).trim();
  return s ? `<div class="val ml">${esc(s)}</div>` : '';
}

/** Nombres: campos nuevos o, para trámites antiguos, partidos desde fullName. */
const MARITAL_EN = Object.freeze({
  'Soltero(a)': 'Single',
  'Casado(a)': 'Married',
  'Divorciado(a)': 'Divorced',
  'Viudo(a)': 'Widowed',
  'Unión libre': 'Common-law union',
});

function resolveNames(data) {
  if (data.firstName || data.lastName || data.secondName) {
    return { firstName: data.firstName || '', secondName: data.secondName || '', lastName: data.lastName || '' };
  }
  return kyciMaster.splitLegacyFullName(data.fullName || '');
}

function buildKyciPdfInnerHtml(data = {}, options = {}) {
  assertKyciPdfI18nParity();
  assertKycPdfFieldRegistryParity();
  assertKyciMasterSpecParity();
  const lang = normalizeLanguage(options.language || data.language);
  const t = getKyciPdfDict(lang);
  const names = resolveNames(data);
  const roles = Array.isArray(data.applicantRoles) ? data.applicantRoles : [];
  const docs = Array.isArray(data.certifiedDocs) ? data.certifiedDocs : [];
  const sourceOfWealth = String(data.sourceOfWealth || '').trim() || kyciMaster.legacySourceOfWealth(data);

  const introList = t.introItems
    .map(([text, bold]) => `<li><span class="tick">&#10003;</span> ${esc(text)} (<b>${esc(bold)}</b>)</li>`)
    .join('');

  const roleCells = kyciMaster.APPLICANT_ROLE_OPTIONS.map(
    (opt) => `<td>${box(roles.includes(opt.key))} ${esc(opt[t.roleLabel])}</td>`
  );
  const roleRows = `<tr>${roleCells.slice(0, 5).join('')}</tr><tr>${roleCells.slice(5).join('')}</tr>`;

  const docLines = kyciMaster.CERTIFIED_DOC_OPTIONS.map((opt) => {
    const label = esc(opt[t.roleLabel]).replace(/ (AND|Y)$/, ' <b>$1</b>');
    return `<div class="doc-line">${box(docs.includes(opt.key))} ${label}</div>`;
  }).join('');

  const offence = (n, key) => `
        <div class="q"><span class="qn">${n}.</span> ${esc(t[key])}</div>
        <div class="line">${yesNo(data[key], t)}</div>
        <div class="line">${esc(t.offenceDetails)} ${multiline(data[`${key}Details`])}</div>`;

  return `
    <header class="doc-header">
      <div class="title">${esc(t.docTitle).replace('\n', '<br/>')}</div>
      <div class="subtitle">${esc(t.docSubtitle)}</div>
    </header>

    <table class="frm entity"><tbody>
      <tr><td class="lbl b">${esc(t.panamaEntityName)}</td><td>${val(data.panamaEntityName)}</td></tr>
    </tbody></table>

    <div class="boxed intro">
      <div class="b">${esc(t.introTitle)}</div>
      <ul>${introList}</ul>
      <div>${esc(t.introNote)}</div>
    </div>

    <div class="boxed roles">
      <div class="b">${esc(t.applicantRolesTitle)}</div>
      <table class="roles-grid"><tbody>${roleRows}</tbody></table>
    </div>

    <table class="frm"><tbody>
      <tr>
        <td class="lbl" rowspan="2">${esc(t.fullNameLabel)}</td>
        <td>${esc(t.firstName)} ${val(names.firstName)}</td>
        <td class="w30">${esc(t.secondName)} ${val(names.secondName)}</td>
      </tr>
      <tr><td colspan="2">${esc(t.lastName)} ${val(names.lastName)}</td></tr>
      <tr>
        <td class="lbl">${esc(t.birthDate)}</td>
        <td>${data.birthDate ? val(fmtDate(data.birthDate)) : esc(t.datePlaceholder)}</td>
        <td class="w30">${esc(t.nationality)} ${val(data.nationality)}</td>
      </tr>
      <tr>
        <td class="lbl">${esc(t.birthPlace)}</td>
        <td>${val(data.birthPlace)}</td>
        <td class="w30">${esc(t.passport)} ${val(data.passport)}</td>
      </tr>
      <tr><td class="lbl">${esc(t.address)}</td><td colspan="2">${val(data.address)}</td></tr>
      <tr><td class="lbl">${esc(t.maritalStatus)}</td><td colspan="2">${val(t.lang === 'en' ? MARITAL_EN[data.maritalStatus] || data.maritalStatus : data.maritalStatus)}</td></tr>
      <tr><td class="lbl">${esc(t.phone)}</td><td colspan="2">${val(data.phone)}</td></tr>
      <tr><td class="lbl">${esc(t.email)}</td><td colspan="2">${val(data.email)}</td></tr>
      <tr>
        <td class="lbl">${esc(t.taxResidenceCountries)}</td>
        <td colspan="2">
          <div class="line">${val(data.taxResidenceCountries)}</div>
          <div class="line">${esc(t.otherTaxResidence)} ${yesNo(data.otherTaxResidence, t)} ${esc(t.otherTaxResidenceDetails)}</div>
          ${multiline(data.otherTaxResidenceDetails)}
          <div class="line">${esc(t.taxNote)}</div>
        </td>
      </tr>
      <tr>
        <td class="lbl">${esc(t.fatcaLabel)}</td>
        <td colspan="2">
          <div class="line">${esc(t.usPerson)}</div>
          <div class="line">${yesNo(data.usPerson, t)}</div>
          <div class="line">${esc(t.usAffirmative)}</div>
          <div class="line">${esc(t.usTin)} ${val(data.usTin)}</div>
          <div class="line">${esc(t.usDetails)} ${multiline(data.usDetails)}</div>
        </td>
      </tr>
    </tbody></table>

    <table class="frm page2"><tbody>
      <tr>
        <td class="lbl">${esc(t.sourceOfWealthLabel)}</td>
        <td><div class="line">${esc(t.sourceOfWealth)}</div>${multiline(sourceOfWealth)}</td>
      </tr>
      <tr>
        <td class="lbl">${esc(t.pepLabel)}</td>
        <td>
          <div class="line">${esc(t.pep)}</div>
          <div class="line">${yesNo(data.pep, t)}</div>
          <div class="line">${esc(t.pepDetails)}</div>
          ${multiline(data.pepDetails)}
        </td>
      </tr>
      <tr>
        <td class="lbl">${esc(t.offencesLabel)}</td>
        <td>
          ${offence(1, 'offenceConvicted')}
          ${offence(2, 'offenceBankrupt')}
          ${offence(3, 'offenceInvestigation')}
        </td>
      </tr>
    </tbody></table>

    <div class="docs-title">${esc(t.docsTitle)}</div>
    <div class="boxed docs">
      <div>${esc(t.docsIntroBefore)}<b>${esc(t.docsIntroBold)}</b>${esc(t.docsIntroAfter)}</div>
      ${docLines}
      <div class="docs-footer">${esc(t.docsFooter)}</div>
    </div>
    <div class="boxed declaration">${esc(t.declaration)}</div>
    <table class="frm sign"><tbody>
      <tr>
        <td class="lbl">${esc(t.signature)}</td>
        <td class="sig-box">&nbsp;</td>
        <td class="lbl date-lbl">${esc(t.declarationDate)}</td>
        <td class="date-val">${data.declarationDate ? val(fmtDate(data.declarationDate)) : '&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;/'}</td>
      </tr>
    </tbody></table>

    <section class="notes">
      <div class="notes-title">${esc(t.notesTitle)}</div>
      <ol>${t.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ol>
    </section>
  `;
}

class KyciHtmlPdfService {
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
      const inner = buildKyciPdfInnerHtml(data, { language: lang });

      const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; }
    * { box-sizing: border-box; }
    body { font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 9.5px; color: #0f172a; margin: 0; padding: 0; }
    .doc-header { text-align: right; margin-bottom: 8px; }
    .doc-header .title { font-weight: 700; font-size: 12px; }
    .doc-header .subtitle { font-weight: 700; font-size: 12px; margin-top: 2px; }
    .b { font-weight: 700; }
    .frm { width: 100%; border-collapse: collapse; }
    .frm td { border: 1px solid #4b2e83; padding: 4px 6px; vertical-align: top; }
    .frm .lbl { width: 23%; }
    .frm .w30 { width: 32%; }
    .entity td { border: none; padding: 2px 0; }
    .entity .lbl { width: 32%; }
    .boxed { border: 1px solid #4b2e83; padding: 6px 8px; margin: 0; }
    .boxed + .boxed, .boxed + .frm, .frm + .boxed { border-top: none; }
    .intro ul { list-style: none; margin: 4px 0; padding: 0 0 0 4px; }
    .intro li { margin: 1px 0; }
    .tick { display: inline-block; width: 14px; }
    .roles-grid { width: 100%; border-collapse: collapse; margin: 8px 0 4px; }
    .roles-grid td { border: 1px solid #000; padding: 4px 6px 4px 22px; text-indent: -17px; width: 20%; }
    .box { display: inline-block; width: 10px; height: 10px; line-height: 10px; border: 1px solid #000; font-size: 9px; font-weight: 700; text-align: center; vertical-align: middle; margin: 0 3px; }
    .yn { margin-right: 16px; white-space: nowrap; }
    .line { margin: 3px 0; }
    .q { margin: 3px 0 3px 18px; }
    .qn { display: inline-block; width: 18px; }
    .val { font-weight: 700; color: #0f172a; }
    .ml { white-space: pre-wrap; margin: 2px 0 4px; }
    .docs-title { text-align: center; font-weight: 700; margin: 8px 0 4px; }
    .doc-line { margin: 1px 0; }
    .docs-footer { margin-top: 8px; }
    .sign { page-break-inside: avoid; }
    .sign td { border-top: none; }
    .sign .sig-box { height: 42px; width: 40%; }
    .sign .date-lbl { width: 14%; }
    .page2 { page-break-before: always; }
    .page2 td:nth-child(2) { width: 77%; }
    .notes { page-break-before: always; }
    .notes-title { text-align: center; font-weight: 700; text-decoration: underline; margin: 6px 0 14px; }
    .notes ol { padding-left: 22px; }
    .notes li { margin-bottom: 10px; text-align: justify; }
    tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  ${inner}
</body>
</html>`;

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
  buildKyciPdfInnerHtml,
  generatePdf: (data, options) => new KyciHtmlPdfService().generatePdf(data, options),
};
