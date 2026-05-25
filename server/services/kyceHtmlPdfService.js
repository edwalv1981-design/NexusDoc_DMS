'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getKycePdfDict, normalizeLanguage, assertKycePdfI18nParity } = require('./kycePdfI18n');
const { assertKycPdfFieldRegistryParity } = require('../config/kycPdfFieldRegistry');
const { KYCE_FUNDS_SOURCE_OPTIONS } = require('../config/pdfFormSchemas');
const {
  esc,
  fmtDate,
  kvRow,
  formatYesNoChecks,
  buildFundsChecksHtml,
  isPepYes,
  sectionGuideHtml,
} = require('../utils/kycHtmlPdfShared');

const KYCE_FUNDS_LABEL_KEYS = {
  bienes: 'fundsBienes',
  inversiones: 'fundsInversiones',
  negocios: 'fundsNegocios',
  prestamos: 'fundsPrestamos',
  capital: 'fundsHerencia',
};

const FUNDS_SOURCE_KEYS = KYCE_FUNDS_SOURCE_OPTIONS.map((o) => ({
  key: o.key,
  labelKey: KYCE_FUNDS_LABEL_KEYS[o.labelKey] || o.labelKey,
}));

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

function buildKycePdfInnerHtml(data = {}, options = {}) {
  assertKycePdfI18nParity();
  assertKycPdfFieldRegistryParity();
  const lang = normalizeLanguage(options.language || data.language);
  const t = getKycePdfDict(lang);
  const pepYes = isPepYes(data.pep);

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

  const representativeRows = [
    kvRow(t.legalRepName, data.legalRepName),
    kvRow(t.legalRepId, data.legalRepId),
    kvRow(t.legalRepNationality, data.legalRepNationality),
    kvRow(t.beneficialOwners, data.beneficialOwners),
  ].join('');

  const complianceRows = [
    kvRow(t.pep, formatYesNoChecks(pepYes, !pepYes, t)),
    pepYes ? kvRow(t.pepDetails, data.pepDetails) : '',
    kvRow(t.fundsOther, data.fundsOther),
  ].join('');

  const fundsBlock =
    '<div class="funds-block">' +
    '<div class="funds-title">' +
    esc(t.fundsSource) +
    '</div>' +
    buildFundsChecksHtml(FUNDS_SOURCE_KEYS, data, t) +
    '</div>';

  return (
    '<header class="doc-header">' +
    '<h1>' +
    esc(t.docTitle) +
    '</h1>' +
    '<p class="subtitle">' +
    esc(t.docSubtitle) +
    '</p>' +
    '</header>' +
    '<section class="card">' +
    '<h2>' +
    esc(t.sectionEntity) +
    '</h2>' +
    sectionGuideHtml(t.sectionEntityGuide) +
    '<table class="kv-table"><tbody>' +
    entityRows +
    '</tbody></table>' +
    '</section>' +
    '<section class="card">' +
    '<h2>' +
    esc(t.sectionContact) +
    '</h2>' +
    sectionGuideHtml(t.sectionContactGuide) +
    '<table class="kv-table"><tbody>' +
    contactRows +
    '</tbody></table>' +
    '</section>' +
    '<section class="card">' +
    '<h2>' +
    esc(t.sectionRepresentatives) +
    '</h2>' +
    sectionGuideHtml(t.sectionRepresentativesGuide) +
    '<table class="kv-table"><tbody>' +
    representativeRows +
    '</tbody></table>' +
    '</section>' +
    '<section class="card">' +
    '<h2>' +
    esc(t.sectionCompliance) +
    '</h2>' +
    sectionGuideHtml(t.sectionComplianceGuide) +
    '<table class="kv-table"><tbody>' +
    complianceRows +
    '</tbody></table>' +
    fundsBlock +
    '</section>' +
    '<section class="card declaration">' +
    '<h2>' +
    esc(t.sectionDeclaration) +
    '</h2>' +
    '<table class="kv-table"><tbody>' +
    kvRow(t.declarationName, data.declarationName) +
    kvRow(t.declarationDate, fmtDate(data.declarationDate)) +
    '</tbody></table>' +
    '</section>'
  );
}

class KyceHtmlPdfService {
  async generatePdf(data = {}, options = {}) {
    let browser = null;
    try {
      const rootDir = process.cwd().includes('server') ? path.join(process.cwd(), '..') : process.cwd();
      let logoHtml = '';
      let logoDataUri = '';
      const logoPath = path.join(rootDir, 'templates', 'logo_empresa.png');
      if (fs.existsSync(logoPath)) {
        logoDataUri = toDataUri(logoPath);
        logoHtml = '<div class="logo-wrap"><img src="' + logoDataUri + '" alt="" class="logo" /></div>';
      }

      const lang = normalizeLanguage(options.language || data.language);
      const inner = buildKycePdfInnerHtml(data, { language: lang });

      const html =
        '<!DOCTYPE html><html lang="' +
        lang +
        '"><head><meta charset="utf-8" /><style>' +
        '@page { size: A4; margin: 14mm 12mm; }' +
        '* { box-sizing: border-box; }' +
        'body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #0f172a; margin: 0; }' +
        '.logo-wrap { text-align: right; margin-bottom: 8px; }' +
        '.logo { max-height: 48px; max-width: 160px; }' +
        '.doc-header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; }' +
        '.doc-header h1 { margin: 0 0 4px; font-size: 14px; color: #1e40af; }' +
        '.subtitle { margin: 0; font-size: 10px; color: #64748b; }' +
        '.card { border: 1px solid #93c5fd; margin: 10px 0; page-break-inside: avoid; }' +
        '.card h2 { margin: 0; background: #1d4ed8; color: #fff; padding: 6px 10px; font-size: 12px; }' +
        '.section-guide { margin: 0; padding: 8px 10px; font-size: 10px; color: #475569; background: #eff6ff; border-bottom: 1px solid #bfdbfe; }' +
        '.kv-table { width: 100%; border-collapse: collapse; }' +
        '.kv-table td { border: 1px solid #bfdbfe; padding: 5px 8px; vertical-align: top; }' +
        '.kv-label { width: 38%; font-weight: 700; background: #eff6ff; color: #334155; }' +
        '.funds-block { padding: 10px 12px; }' +
        '.funds-title { font-weight: 700; margin-bottom: 6px; color: #334155; }' +
        '.chk-line { margin: 4px 0; }' +
        '.chk { font-family: monospace; font-weight: 700; }' +
        '.declaration { margin-top: 12px; }' +
        '</style></head><body>' +
        logoHtml +
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
        ? `<div style="font-size:0;width:100%;padding:4px 12mm;"><img src="${logoDataUri}" style="height:36px;width:auto;" /></div>`
        : '<div style="font-size:1px;">&nbsp;</div>';
      const footerTemplate = '<div style="font-size:1px;">&nbsp;</div>';

      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '15mm', right: '10mm', bottom: '12mm', left: '10mm' },
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
