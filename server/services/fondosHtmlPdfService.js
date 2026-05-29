'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getFondosPdfDict, normalizeLanguage } = require('./fondosPdfI18n');
const { esc, fmtDate, kvRow, buildFundsChecksHtml } = require('../utils/kycHtmlPdfShared');

const FUNDS_KEYS = [
  { key: 'Bienes personales', labelKey: 'fundsBienes' },
  { key: 'Inversiones Financieras', labelKey: 'fundsInversiones' },
  { key: 'Negocios', labelKey: 'fundsNegocios' },
  { key: 'Prestamos', labelKey: 'fundsPrestamos' },
  { key: 'Herencia o Fondo Fiduciario', labelKey: 'fundsHerencia' },
];

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
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

function buildFondosPdfInnerHtml(data = {}, options = {}) {
  const lang = normalizeLanguage(options.language || data.language);
  const t = getFondosPdfDict(lang);

  const companyRows = [
    kvRow(t.companyName, data.companyName),
    kvRow(t.activities, data.activities),
    kvRow(t.country, data.country),
    kvRow(t.operatingAddress, data.operatingAddress),
  ].join('');

  const beneficiaryRows = [
    kvRow(t.beneficiaryName, data.beneficiaryName),
    kvRow(t.birthDate, fmtDate(data.birthDate)),
    kvRow(t.birthPlace, data.birthPlace),
    kvRow(t.address, data.address),
  ].join('');

  const custodyRows = [
    kvRow(t.custodyName, data.custodyName),
    kvRow(t.custodyPhone, data.custodyPhone),
    kvRow(t.custodyEmail, data.custodyEmail),
    kvRow(t.custodyAddress, data.custodyAddress),
  ].join('');

  const signatureRows = [
    kvRow(t.fiscalYear, data.fiscalYear),
    kvRow(t.signerName, data.signerName),
    kvRow(t.date, fmtDate(data.date)),
  ].join('');

  return `
    <header class="doc-header">
      <h1>${esc(t.docTitle)}</h1>
      <p class="subtitle">${esc(t.docSubtitle)}</p>
    </header>

    <section class="card">
      <h2>${esc(t.sectionCompany)}</h2>
      <table class="kv-table"><tbody>${companyRows}</tbody></table>
    </section>

    <section class="card">
      <h2>${esc(t.sectionBeneficiary)}</h2>
      <table class="kv-table"><tbody>${beneficiaryRows}</tbody></table>
    </section>

    <section class="card">
      <h2>${esc(t.sectionFunds)}</h2>
      <div class="funds-block">
        <div class="funds-title">${esc(t.fundsSource)}</div>
        ${buildFundsChecksHtml(FUNDS_KEYS, data, t)}
      </div>
      <table class="kv-table"><tbody>${kvRow(t.fundsOther, data.fundsOther)}</tbody></table>
    </section>

    <section class="card">
      <h2>${esc(t.sectionCustody)}</h2>
      <table class="kv-table"><tbody>${custodyRows}</tbody></table>
    </section>

    <section class="card declaration">
      <h2>${esc(t.sectionSignature)}</h2>
      <table class="kv-table"><tbody>${signatureRows}</tbody></table>
    </section>

    <section class="card declaration-text">
      <p class="declaration-es">${esc(t.declarationText)}</p>
    </section>

    <section class="card signature-section">
      <div class="signature-block">
        <div class="signature-label">${esc(t.signatureLabel)}:</div>
        <div class="signature-line"></div>
      </div>
      <div class="signature-info">
        <div><strong>${esc(t.signerName)}:</strong> ${esc(data.signerName || '')}</div>
        <div><strong>${esc(t.date)}:</strong> ${esc(fmtDate(data.date))}</div>
      </div>
    </section>
  `;
}

class FondosHtmlPdfService {
  async generatePdf(data = {}, options = {}) {
    let browser = null;
    try {
      const rootDir = process.cwd().includes('server') ? path.join(process.cwd(), '..') : process.cwd();
      let logoDataUri = '';
      const logoPath = path.join(rootDir, 'templates', 'logo_empresa.png');
      if (fs.existsSync(logoPath)) logoDataUri = toDataUri(logoPath);

      const lang = normalizeLanguage(options.language || data.language);
      const inner = buildFondosPdfInnerHtml(data, { language: lang });

      const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 0; }
    .doc-header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #0891b2; padding-bottom: 10px; }
    .doc-header h1 { margin: 0 0 4px; font-size: 14px; color: #0e7490; }
    .subtitle { margin: 0; font-size: 10px; color: #64748b; }
    .card { border: 1px solid #7dd3fc; margin: 10px 0; page-break-inside: avoid; }
    .card h2 { margin: 0; background: #0891b2; color: #fff; padding: 6px 10px; font-size: 12px; }
    .kv-table { width: 100%; border-collapse: collapse; }
    .kv-table td { border: 1px solid #bae6fd; padding: 5px 8px; vertical-align: top; }
    .kv-label { width: 38%; font-weight: 700; background: #f0f9ff; color: #334155; }
    .funds-block { padding: 10px 12px; border-bottom: 1px solid #bae6fd; }
    .funds-title { font-weight: 700; margin-bottom: 6px; color: #334155; }
    .chk-line { margin: 4px 0; }
    .chk { font-family: monospace; font-weight: 700; }
    .declaration { margin-top: 12px; }
    .declaration-text { padding: 12px; }
    .declaration-en { margin: 0 0 8px; font-size: 10px; line-height: 1.4; color: #334155; }
    .declaration-es { margin: 0; font-size: 10px; line-height: 1.4; color: #334155; }
    .signature-section { padding: 12px; }
    .signature-block { margin-bottom: 12px; }
    .signature-label { font-weight: 700; margin-bottom: 4px; color: #334155; }
    .signature-line { border-bottom: 1px solid #334155; height: 30px; }
    .signature-info { font-size: 10px; color: #334155; }
    .signature-info div { margin: 4px 0; }
  </style>
</head>
<body>${inner}</body>
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
  buildFondosPdfInnerHtml,
  generatePdf: (data, options) => new FondosHtmlPdfService().generatePdf(data, options),
};
