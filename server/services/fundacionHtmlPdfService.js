const puppeteer = require('puppeteer');
const fundacionLayoutGuard = require('./fundacionLayoutGuard');
const fundacionPdfI18n = require('./fundacionPdfI18n');
const fs = require('fs');
const path = require('path');

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

function getFounderRecord(data) {
  if (data.founder && typeof data.founder === 'object') return data.founder;
  const founders = Array.isArray(data.founders) ? data.founders : [];
  return founders[0] || {};
}

function getDirectors(data) {
  if (Array.isArray(data.councilMembers) && data.councilMembers.length) return data.councilMembers;
  if (Array.isArray(data.directors) && data.directors.length) return data.directors;
  return [];
}

function buildDirectorsRows(members, t) {
  if (!members.length) {
    return `<tr><td colspan="9" style="text-align:center;font-style:italic;">${esc(t.emptyDirectors)}</td></tr>`;
  }
  return members
    .map(
      (m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc([m.firstName, m.secondName, m.lastName].filter(Boolean).join(' '))}</td>
      <td>${esc(fmtDate(m.birthDate))}</td>
      <td>${esc(m.maritalStatus)}</td>
      <td>${esc(m.nationality)}</td>
      <td>${esc(m.passport)}</td>
      <td>${esc(m.address)}</td>
      <td>${esc(m.city)}</td>
      <td>${esc(m.country)}</td>
    </tr>
  `
    )
    .join('');
}

function buildProtectorsRows(protectors, t) {
  if (!protectors.length) {
    return `<tr><td colspan="5" style="text-align:center;font-style:italic;">${esc(t.emptyProtectors)}</td></tr>`;
  }
  return protectors
    .map(
      (p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(p.fullName)}</td>
      <td>${esc(fmtDate(p.birthDate))}</td>
      <td>${esc(p.passport)}</td>
      <td>${esc(p.address)}</td>
    </tr>
  `
    )
    .join('');
}

function buildDignitariesRows(dignitaries, t) {
  if (!dignitaries.length) {
    return `<tr><td colspan="4" style="text-align:center;font-style:italic;">${esc(t.emptyDignitaries)}</td></tr>`;
  }
  return dignitaries
    .map(
      (d) => `
    <tr>
      <td>${esc(d.role)}</td>
      <td>${esc(d.fullName)}</td>
      <td>${esc(fmtDate(d.birthDate))}</td>
      <td>${esc(d.passport)}</td>
    </tr>
  `
    )
    .join('');
}

function buildBeneficiariesRows(beneficiaries, t) {
  if (!beneficiaries.length) {
    return `<tr><td colspan="6" style="text-align:center;font-style:italic;">${esc(t.emptyBeneficiaries)}</td></tr>`;
  }
  return beneficiaries
    .map(
      (b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(b.fullName)}</td>
      <td>${esc(fmtDate(b.birthDate))}</td>
      <td>${esc(b.passport)}</td>
      <td>${esc(b.percentage)}</td>
      <td>${esc(b.address)}</td>
    </tr>
  `
    )
    .join('');
}

function buildPowersHtml(data, t) {
  const poaIssueYes = data.poaIssue === 'YES';
  const poaIssueNo = data.poaIssue === 'NO' || !data.poaIssue;
  const poaLegalizedYes = data.poaLegalized === 'YES';
  const poaLegalizedNo = data.poaLegalized === 'NO' || !data.poaLegalized;
  const poaTypeLabel = String(data.poaType || 'GENERAL').toUpperCase();

  return `
    <section class="card card--poa">
      <h2>${esc(t.sectionPowers)}</h2>
      <div class="poa-grid">
        <div class="poa-col">
          <table>
            <thead><tr><th colspan="2">${esc(t.poaHeaderGrantee)}</th></tr></thead>
            <tbody>
              <tr><td>${esc(t.poaFirstName)}</td><td>${esc(data.poaFirstName)}</td></tr>
              <tr><td>${esc(t.poaMiddleName)}</td><td>${esc(data.poaMiddleName)}</td></tr>
              <tr><td>${esc(t.poaLastName)}</td><td>${esc(data.poaLastName)}</td></tr>
              <tr><td>${esc(t.poaBirthDate)}</td><td>${esc(fmtDate(data.poaBirthDate))}</td></tr>
              <tr><td>${esc(t.poaMaritalStatus)}</td><td>${esc(data.poaMaritalStatus)}</td></tr>
              <tr><td>${esc(t.poaNationality)}</td><td>${esc(data.poaNationality)}</td></tr>
              <tr><td>${esc(t.poaPassport)}</td><td>${esc(data.poaPassport)}</td></tr>
              <tr><td>${esc(t.poaIdCard)}</td><td>${esc(data.poaIdCard)}</td></tr>
              <tr><td>${esc(t.poaPhone)}</td><td>${esc(data.poaPhone)}</td></tr>
              <tr><td>${esc(t.poaEmail)}</td><td>${esc(data.poaEmail)}</td></tr>
              <tr><td>${esc(t.poaAddress)}</td><td>${esc(data.poaAddress)}</td></tr>
              <tr><td>${esc(t.poaCity)}</td><td>${esc(data.poaCity)}</td></tr>
              <tr><td>${esc(t.poaCountry)}</td><td>${esc(data.poaCountry)}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="poa-col">
          <table>
            <tbody>
              <tr>
                <td>${esc(t.poaIssueQuestion)}</td>
                <td><span class="chk">${poaIssueYes ? '☑' : '☐'} ${esc(t.yes)}</span> <span class="chk">${poaIssueNo ? '☑' : '☐'} ${esc(t.no)}</span></td>
              </tr>
              <tr><td>${esc(t.poaTypeQuestion)}</td><td><strong>${esc(poaTypeLabel)}</strong></td></tr>
              <tr><td>${esc(t.poaValidityQuestion)}</td><td>${esc(data.poaValidityDate)}</td></tr>
              <tr>
                <td>${esc(t.poaLegalizedQuestion)}</td>
                <td><span class="chk">${poaLegalizedYes ? '☑' : '☐'} ${esc(t.yes)}</span> <span class="chk">${poaLegalizedNo ? '☑' : '☐'} ${esc(t.no)}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

class FundacionHtmlPdfService {
  async generatePdf(data = {}, options = {}) {
    fundacionPdfI18n.assertFundacionPdfI18nParity();
    let browser = null;
    try {
      const rootDir = process.cwd().includes('server') ? path.join(process.cwd(), '..') : process.cwd();
      let logoDataUri = '';
      const logoPath = path.join(rootDir, 'templates', 'logo_empresa.png');
      if (fs.existsSync(logoPath)) logoDataUri = toDataUri(logoPath);

      const founder = getFounderRecord(data);
      const directors = getDirectors(data);
      const protectors = Array.isArray(data.protectors) ? data.protectors : [];
      const beneficiaries = Array.isArray(data.beneficiaries) ? data.beneficiaries : [];
      const dignitaries = Array.isArray(data.dignitaries) ? data.dignitaries : [];

      const lang = fundacionPdfI18n.normalizeLanguage(options.language || data.language);
      const t = fundacionPdfI18n.getFundacionPdfDict(lang);

      const plan = fundacionLayoutGuard.analyzeFormData(data);
      const layoutCss = fundacionLayoutGuard.getAdaptiveCss(plan);
      const bodyGuardClass = fundacionLayoutGuard.bodyClassForPlan(plan);
      const pageMarginCss = fundacionLayoutGuard.getPrintPageMarginCss(fundacionLayoutGuard.LAYOUT);

      const declarationName =
        data.declarationName ||
        (Array.isArray(data.signers) && data.signers[0]?.name) ||
        '';
      const declarationSignature =
        data.declarationSignature ||
        (Array.isArray(data.signers) && data.signers[0]?.signature) ||
        declarationName;

      const founderRows = founder.fullName
        ? `<tr>
            <td>1</td>
            <td>${esc(founder.fullName)}</td>
            <td>${esc(fmtDate(founder.birthDate))}</td>
            <td>${esc(founder.birthPlace)}</td>
            <td>${esc(founder.passport)}</td>
            <td>${esc(founder.nationality)}</td>
            <td>${esc(founder.address)}</td>
          </tr>`
        : `<tr><td colspan="7" style="text-align:center;font-style:italic;">${esc(t.emptyFounder)}</td></tr>`;

      const content = `
        <main class="doc-body">
          <section class="card">
            <div class="first-page-title"><h1>${esc(t.docTitle)}</h1></div>
            <h2>${esc(t.sectionName)}</h2>
            <div class="hint">${esc(t.sectionNameHint)}</div>
            <div class="grid3">
              <div><label>${esc(t.choice1)}</label><div class="value">${esc(data.foundationNameOption1)}</div>
              <div><label>${esc(t.choice2)}</label><div class="value">${esc(data.foundationNameOption2)}</div>
              <div><label>${esc(t.choice3)}</label><div class="value">${esc(data.foundationNameOption3)}</div>
            </div>
          </section>

          <section class="card">
            <h2>${esc(t.sectionCapital)}</h2>
            <div class="hint">${esc(t.sectionCapitalHint)}</div>
            <table class="capital-table">
              <thead><tr><th>${esc(t.capitalMin)}</th><th>${esc(t.capitalAuth)}</th></tr></thead>
              <tbody><tr><td>10,000 USD</td><td>${esc(data.initialPatrimony)} USD</td></tr></tbody>
            </table>
          </section>

          <section class="card">
            <h2>${esc(t.sectionFounder)}</h2>
            <table>
              <thead>
                <tr>
                  <th>${esc(t.dirNum)}</th>
                  <th>${esc(t.founderName)}</th>
                  <th>${esc(t.founderBirthDate)}</th>
                  <th>${esc(t.founderBirthPlace)}</th>
                  <th>${esc(t.founderPassport)}</th>
                  <th>${esc(t.founderNationality)}</th>
                  <th>${esc(t.founderAddress)}</th>
                </tr>
              </thead>
              <tbody>${founderRows}</tbody>
            </table>
          </section>

          <section class="card">
            <h2>${esc(t.sectionProtectors)}</h2>
            <table>
              <thead>
                <tr>
                  <th>${esc(t.dirNum)}</th>
                  <th>${esc(t.protectorName)}</th>
                  <th>${esc(t.protectorBirthDate)}</th>
                  <th>${esc(t.protectorPassport)}</th>
                  <th>${esc(t.protectorAddress)}</th>
                </tr>
              </thead>
              <tbody>${buildProtectorsRows(protectors, t)}</tbody>
            </table>
          </section>

          <section class="card">
            <h2>${esc(t.sectionDirectors)}</h2>
            <div class="hint">${esc(t.sectionDirectorsHint)}</div>
            <table>
              <thead>
                <tr>
                  <th>${esc(t.dirNum)}</th>
                  <th>${esc(t.dirFullName)}</th>
                  <th>${esc(t.dirBirthDate)}</th>
                  <th>${esc(t.dirMarital)}</th>
                  <th>${esc(t.dirNationality)}</th>
                  <th>${esc(t.dirPassport)}</th>
                  <th>${esc(t.dirAddress)}</th>
                  <th>${esc(t.dirCity)}</th>
                  <th>${esc(t.dirCountry)}</th>
                </tr>
              </thead>
              <tbody>${buildDirectorsRows(directors, t)}</tbody>
            </table>
          </section>

          <section class="card">
            <h2>${esc(t.sectionDignitaries)}</h2>
            <table>
              <thead>
                <tr>
                  <th>${esc(t.dignitaryRole)}</th>
                  <th>${esc(t.dignitaryName)}</th>
                  <th>${esc(t.dignitaryBirthDate)}</th>
                  <th>${esc(t.dignitaryPassport)}</th>
                </tr>
              </thead>
              <tbody>${buildDignitariesRows(dignitaries, t)}</tbody>
            </table>
          </section>

          <section class="card">
            <h2>${esc(t.sectionBeneficiaries)}</h2>
            <table>
              <thead>
                <tr>
                  <th>${esc(t.dirNum)}</th>
                  <th>${esc(t.beneficiaryName)}</th>
                  <th>${esc(t.beneficiaryBirthDate)}</th>
                  <th>${esc(t.beneficiaryPassport)}</th>
                  <th>${esc(t.beneficiaryPercentage)}</th>
                  <th>${esc(t.beneficiaryAddress)}</th>
                </tr>
              </thead>
              <tbody>${buildBeneficiariesRows(beneficiaries, t)}</tbody>
            </table>
          </section>

          ${buildPowersHtml(data, t)}

          <section class="tail-block">
            <section class="card card--activities">
              <h2>${esc(t.sectionActivities)}</h2>
              <div class="hint">${esc(t.sectionActivitiesHint)}</div>
              <div class="longtext">${esc(data.foundationObjects)}</div>
            </section>

            <section class="card">
              <h2>${esc(t.sectionDeclaration)}</h2>
              <div class="hint">${esc(t.sectionDeclarationHint)}</div>
              <div class="grid2">
                <div><label>${esc(t.declarationSignature)}</label><div class="value">${esc(declarationSignature)}</div></div>
                <div><label>${esc(t.declarationName)}</label><div class="value">${esc(declarationName)}</div></div>
                <div><label>${esc(t.declarationDate)}</label><div class="value">${esc(fmtDate(data.declarationDate))}</div></div>
              </div>
            </section>
          </section>
        </main>
      `;

      const html = `
        <!doctype html>
        <html lang="${lang}">
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: ${pageMarginCss}; }
            html, body { margin: 0; padding: 0; }
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 10px; }
            .doc-body { padding: 0; margin: 0; box-sizing: border-box; }
            .first-page-title { text-align: center; margin: 0 0 6px 0; }
            .first-page-title h1 { margin: 0; color: #0369a1; font-size: 20px; line-height: 1.02; font-weight: 800; }
            .card { border: 1px solid #7dd3fc; margin: 8px 0; page-break-inside: auto; break-inside: auto; }
            .card h2 { margin: 0; background: #0891b2; color: #fff; padding: 6px 8px; font-size: 12px; }
            .hint { padding: 4px 8px; background: #f0f9ff; border-bottom: 1px solid #bae6fd; color: #334155; line-height: 1.25; }
            .grid3, .grid2 { display: grid; gap: 8px; padding: 8px; }
            .grid3 { grid-template-columns: 1fr 1fr 1fr; }
            .grid2 { grid-template-columns: 1fr 1fr; }
            label { display: block; font-weight: 700; color: #334155; margin-bottom: 2px; }
            .value { min-height: 18px; border: 1px solid #bae6fd; padding: 4px; background: #f8fdff; word-break: break-word; }
            .capital-table td { text-align: center; font-weight: 700; font-size: 11px; padding: 8px; }
            .tail-block { page-break-inside: avoid; break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            thead { display: table-header-group; }
            th, td { border: 1px solid #7dd3fc; padding: 2px 3px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
            th { background: #ecfeff; font-size: 9px; }
            .longtext { padding: 8px; min-height: 42px; white-space: pre-wrap; word-break: break-word; }
            .poa-grid { display: grid; grid-template-columns: 1.15fr 0.85fr; }
            .poa-col { padding: 0; }
            .chk { margin-right: 8px; font-weight: 700; }
            ${layoutCss}
          </style>
        </head>
        <body class="${bodyGuardClass}">${content}</body>
        </html>
      `;

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await fundacionLayoutGuard.refineAfterRender(page);
      const chromePdf = fundacionLayoutGuard.getFundacionPuppeteerPdfChromeOptions(logoDataUri);
      const { margin: _m, ...chromePdfRest } = chromePdf;
      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        scale: 1,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        ...chromePdfRest,
      });
      return Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);
    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = new FundacionHtmlPdfService();
