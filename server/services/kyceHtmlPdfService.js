'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getKycePdfDict, normalizeLanguage, assertKycePdfI18nParity } = require('./kycePdfI18n');
const { assertKycPdfFieldRegistryParity } = require('../config/kycPdfFieldRegistry');

const FUNDS_SOURCE_KEYS = Object.freeze([
  { key: 'Bienes de la entidad', labelKey: 'fundsBienes' },
  { key: 'Inversiones Financieras', labelKey: 'fundsInversiones' },
  { key: 'Ingresos por negocios', labelKey: 'fundsNegocios' },
  { key: 'Préstamos / créditos', labelKey: 'fundsPrestamos' },
  { key: 'Aportes de socios / capital', labelKey: 'fundsHerencia' },
]);

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(v) {
  if (!v) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  return s;
}

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

function kvRow(label, value) {
  return `<tr><td class="kv-label">${esc(label)}</td><td>${esc(value || '—')}</td></tr>`;
}

function buildFundsChecksHtml(data, t) {
  const selected = Array.isArray(data.fundsSource) ? data.fundsSource : [];
  return FUNDS_SOURCE_KEYS.map(({ key, labelKey }) => {
    const mark = selected.includes(key) ? 'X' : ' ';
    return `<div class="chk-line"><span class="chk">[${mark}]</span> ${esc(t[labelKey] || key)}</div>`;
  }).join('');
}

function buildKycePdfInnerHtml(data = {}, options = {}) {
  assertKycePdfI18nParity();
  assertKycPdfFieldRegistryParity();
  const lang = normalizeLanguage(options.language || data.language);
  const t = getKycePdfDict(lang);
  const pepYes = String(data.pep || '').trim().toLowerCase().startsWith('s');

  const entityRows = [
    kvRow(t.legalName, data.legalName),
    kvRow(t.tradeName, data.tradeName),
    kvRow(t.entityType, data.entityType),
    kvRow(t.incorporationDate, fmtDate(data.incorporationDate)),
    kvRow(t.jurisdiction, data.jurisdiction),
    kvRow(t.taxId, data.taxId),
    kvRow(t.registrationNumber, data.registrationNumber),
    kvRow(t.registeredAddress, data.registeredAddress),
  ].join('');

  const contactRows = [
    kvRow(t.phone, data.phone),
    kvRow(t.email, data.email),
    kvRow(t.city, data.city),
    kvRow(t.country, data.country),
    kvRow(t.businessActivity, data.businessActivity),
    kvRow(t.website, data.website),
  ].join('');

  const pepDisplay =
    pepYes && data.pepDetails
      ? `${t.yes} — ${data.pepDetails}`
      : pepYes
        ? t.yes
        : t.no;

  return `
    <header class="doc-header">
      <h1>${esc(t.docTitle)}</h1>
      <p class="subtitle">${esc(t.docSubtitle)}</p>
    </header>

    <section class="card">
      <h2>${esc(t.sectionEntity)}</h2>
      <table class="kv-table"><tbody>${entityRows}</tbody></table>
    </section>

    <section class="card">
      <h2>${esc(t.sectionContact)}</h2>
      <table class="kv-table"><tbody>${contactRows}</tbody></table>
    </section>

    <section class="card">
      <h2>${esc(t.sectionRepresentatives)}</h2>
      <table class="kv-table">
        <tbody>
          ${kvRow(t.legalRepName, data.legalRepName)}
          ${kvRow(t.legalRepId, data.legalRepId)}
          ${kvRow(t.legalRepNationality, data.legalRepNationality)}
          ${kvRow(t.beneficialOwners, data.beneficialOwners)}
        </tbody>
      </table>
    </section>

    <section class="card">
      <h2>${esc(t.sectionCompliance)}</h2>
      <table class="kv-table">
        <tbody>
          ${kvRow(t.pep, pepDisplay)}
          ${pepYes ? kvRow(t.pepDetails, data.pepDetails) : ''}
          ${kvRow(t.fundsOther, data.fundsOther)}
        </tbody>
      </table>
      <div class="funds-block">
        <div class="funds-title">${esc(t.fundsSource)}</div>
        ${buildFundsChecksHtml(data, t)}
      </div>
    </section>

    <section class="card declaration">
      <h2>${esc(t.sectionDeclaration)}</h2>
      <table class="kv-table">
        <tbody>
          ${kvRow(t.declarationName, data.declarationName)}
          ${kvRow(t.declarationDate, fmtDate(data.declarationDate))}
        </tbody>
      </table>
    </section>
  `;
}

class KyceHtmlPdfService {
  async generatePdf(data = {}, options = {}) {
    let browser = null;
    try {
      const rootDir = process.cwd().includes('server') ? path.join(process.cwd(), '..') : process.cwd();
      let logoHtml = '';
      const logoPath = path.join(rootDir, 'templates', 'logo_empresa.png');
      if (fs.existsSync(logoPath)) {
        const logoDataUri = toDataUri(logoPath);
        logoHtml = `<div class="logo-wrap"><img src="${logoDataUri}" alt="" class="logo" /></div>`;
      }

      const lang = normalizeLanguage(options.language || data.language);
      const inner = buildKycePdfInnerHtml(data, { language: lang });

      const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #0f172a; margin: 0; }
    .logo-wrap { text-align: right; margin-bottom: 8px; }
    .logo { max-height: 48px; max-width: 160px; }
    .doc-header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; }
    .doc-header h1 { margin: 0 0 4px; font-size: 14px; color: #1e40af; }
    .subtitle { margin: 0; font-size: 10px; color: #64748b; }
    .card { border: 1px solid #93c5fd; margin: 10px 0; page-break-inside: avoid; }
    .card h2 { margin: 0; background: #1d4ed8; color: #fff; padding: 6px 10px; font-size: 12px; }
    .kv-table { width: 100%; border-collapse: collapse; }
    .kv-table td { border: 1px solid #bfdbfe; padding: 5px 8px; vertical-align: top; }
    .kv-label { width: 38%; font-weight: 700; background: #eff6ff; color: #334155; }
    .funds-block { padding: 10px 12px; }
    .funds-title { font-weight: 700; margin-bottom: 6px; color: #334155; }
    .chk-line { margin: 4px 0; }
    .chk { font-family: monospace; font-weight: 700; }
    .declaration { margin-top: 12px; }
  </style>
</head>
<body>
  ${logoHtml}
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
      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
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
