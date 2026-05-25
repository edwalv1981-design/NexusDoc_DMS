const puppeteer = require('puppeteer');
const corporacionLayoutGuard = require('./corporacionLayoutGuard');
const corporacionPdfI18n = require('./corporacionPdfI18n');
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

function buildDirectorBlocks(directors, t) {
  return directors.map((d, i) => `
    <div class="director-block">
      <div class="director-num">Director #${i + 1}</div>
      <table class="director-fields">
        <colgroup><col style="width:33.33%"/><col style="width:33.34%"/><col style="width:33.33%"/></colgroup>
        <tbody>
          <tr>
            <td><div class="dl">${esc(t.dirFirstName)}</div><div class="dv">${esc(d.firstName || '')}</div></td>
            <td><div class="dl">${esc(t.dirMiddleName)}</div><div class="dv">${esc(d.secondName || '')}</div></td>
            <td><div class="dl">${esc(t.dirSurnames)}</div><div class="dv">${esc(d.lastName || '')}</div></td>
          </tr>
          <tr>
            <td><div class="dl">${esc(t.dirBirthDate)}</div><div class="dv">${esc(fmtDate(d.birthDate))}</div></td>
            <td><div class="dl">${esc(t.dirMarital)}</div><div class="dv">${esc(d.maritalStatus || '')}</div></td>
            <td><div class="dl">${esc(t.dirNationality)}</div><div class="dv">${esc(d.nationality || '')}</div></td>
          </tr>
          <tr>
            <td><div class="dl">${esc(t.dirPassport)}</div><div class="dv">${esc(d.passport || '')}</div></td>
            <td><div class="dl">${esc(t.dirPhone)}</div><div class="dv">${esc(d.phone || '')}</div></td>
            <td><div class="dl">${esc(t.dirEmail)}</div><div class="dv">${esc(d.email || '')}</div></td>
          </tr>
          <tr>
            <td><div class="dl">${esc(t.dirAddress)}</div><div class="dv">${esc(d.address || '')}</div></td>
            <td><div class="dl">${esc(t.dirCity)}</div><div class="dv">${esc(d.city || '')}</div></td>
            <td><div class="dl">${esc(t.dirCountry)}</div><div class="dv">${esc(d.country || '')}</div></td>
          </tr>
        </tbody>
      </table>
    </div>
  `).join('');
}

function buildShareholdersRows(shareholders) {
  return shareholders.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(s.certificate)}</td>
      <td>${esc(s.value)}</td>
      <td>${esc(s.shares)}</td>
      <td>${esc(s.name)}</td>
      <td>${esc(s.address)}</td>
    </tr>
  `).join('');
}

function buildDignitariesRows(dignitaries, fmtDate) {
  if (!Array.isArray(dignitaries)) return '';
  return dignitaries.map(d => `
    <tr>
      <td>${esc(d.role)}</td>
      <td>${esc(d.fullName)}</td>
      <td>${esc(fmtDate(d.birthDate))}</td>
      <td>${esc(d.passport)}</td>
      <td>${esc(d.registrationNumber)}</td>
    </tr>
  `).join('');
}

function buildSignersRows(signers, fmtDate, t) {
  if (!Array.isArray(signers)) return '';
  return signers.map(s => `
    <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
      <div><label>${esc(t.declarationSignature)}</label><div class="value">${esc(s.signature)}</div></div>
      <div class="grid2" style="padding: 0; margin-top: 4px;">
        <div><label>${esc(t.declarationName)}</label><div class="value">${esc(s.name)}</div></div>
      </div>
    </div>
  `).join('');
}

class CorporacionHtmlPdfService {
  async generatePdf(data = {}, options = {}) {
    corporacionLayoutGuard.assertCorporacionPdfLayoutInvariants();
    corporacionPdfI18n.assertCorporacionPdfI18nParity();
    let browser = null;
    try {
      const rootDir = process.cwd().includes('server') ? path.join(process.cwd(), '..') : process.cwd();
      let logoDataUri = '';
      const logoPath = path.join(rootDir, 'templates', 'logo_empresa.png');
      if (fs.existsSync(logoPath)) {
        logoDataUri = toDataUri(logoPath);
      }

      const directors = Array.isArray(data.directors) ? data.directors : [];
      const shareholders = Array.isArray(data.shareholders) ? data.shareholders : [];
      const dignitaries = Array.isArray(data.dignitaries) ? data.dignitaries : [];
      const signers = Array.isArray(data.signers) ? data.signers : [];
      
      const capital = Number(String(data.capitalSocial || '10000').replace(/[^\d]/g, '')) || 10000;
      const capitalFmt = new Intl.NumberFormat('en-US').format(capital);

      const lang = corporacionPdfI18n.normalizeLanguage(options.language || data.language);
      const t = corporacionPdfI18n.getCorporacionPdfDict(lang);

      const plan = corporacionLayoutGuard.analyzeFormData(data);
      const layoutCss = corporacionLayoutGuard.getAdaptiveCss(plan);
      const bodyGuardClass = corporacionLayoutGuard.bodyClassForPlan(plan);

      const content = `
        <main class="doc-body">
        <section class="card">
          <div class="first-page-title">
            <h1>${esc(t.docTitle)}</h1>
          </div>
          <h2>${esc(t.sectionName)}</h2>
          <div class="hint">${esc(t.sectionNameHint)}</div>
          <div class="grid3">
            <div><label>${esc(t.choice1)}</label><div class="value">${esc(data.corpNameSA)}</div></div>
            <div><label>${esc(t.choice2)}</label><div class="value">${esc(data.corpNameCorp)}</div></div>
            <div><label>${esc(t.choice3)}</label><div class="value">${esc(data.corpNameInc)}</div></div>
          </div>
        </section>

        <section class="card">
          <h2>${esc(t.sectionCapital)}</h2>
          <div class="hint">${esc(t.sectionCapitalHint)}</div>
          <table class="capital-table">
            <thead>
              <tr><th>${esc(t.capitalMin)}</th><th>${esc(t.capitalAuth)}</th></tr>
            </thead>
            <tbody>
              <tr><td>10,000 USD</td><td>${esc(capitalFmt)} USD</td></tr>
            </tbody>
          </table>
        </section>

        <section class="card directors-card">
          <h2>${esc(t.sectionDirectors)}</h2>
          <div class="hint">${esc(t.sectionDirectorsHint)}</div>
          ${buildDirectorBlocks(directors, t)}
        </section>

        <section class="card officers-card">
          <h2>${esc(t.sectionOfficers)}</h2>
          <table class="officers-table">
            <colgroup>
              <col style="width:14%"/>
              <col style="width:30%"/>
              <col style="width:16%"/>
              <col style="width:20%"/>
              <col style="width:20%"/>
            </colgroup>
            <thead><tr><th>${esc(t.officerPosition)}</th><th>${esc(t.officerFullName)}</th><th>${esc(t.officerBirthDate)}</th><th>${esc(t.officerPassport)}</th><th>${esc(t.officerRegNumber)}</th></tr></thead>
            <tbody>
              ${buildDignitariesRows(dignitaries, fmtDate)}
            </tbody>
          </table>
        </section>


        <section class="card shareholders-card">
          <h2>${esc(t.sectionShareholders)}</h2>
          <table class="shareholders-table">
            <colgroup>
              <col style="width:5%"/>
              <col style="width:14%"/>
              <col style="width:11%"/>
              <col style="width:10%"/>
              <col style="width:28%"/>
              <col style="width:32%"/>
            </colgroup>
            <thead><tr><th>${esc(t.shNum)}</th><th>${esc(t.shCertificate)}</th><th>${esc(t.shValue)}</th><th>${esc(t.shCount)}</th><th>${esc(t.shName)}</th><th>${esc(t.shAddress)}</th></tr></thead>
            <tbody>${buildShareholdersRows(shareholders)}</tbody>
          </table>
        </section>

        <section class="tail-block">
          <section class="card card--activities">
            <h2>${esc(t.sectionActivities)}</h2>
            <div class="hint">${esc(t.sectionActivitiesHint)}</div>
            <div class="longtext">${esc(data.companyActivities)}</div>
          </section>

          <section class="card">
            <h2>${esc(t.sectionDeclaration)}</h2>
            <div class="hint">${esc(t.sectionDeclarationHint)}</div>
            <div style="padding: 8px;">
              ${buildSignersRows(signers, fmtDate, t)}
              <div style="margin-top: 10px;">
                <label>${esc(t.declarationDate)}</label>
                <div class="value">${esc(fmtDate(data.declarationDate))}</div>
              </div>
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
            @page { size: A4; margin: 0; }
            html, body { margin: 0; padding: 0; }
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 9.5px; }
            .doc-body {
              padding: 0;
              margin: 0;
              box-sizing: border-box;
            }
            .first-page-title { text-align: center; margin: 0 0 6px 0; }
            .first-page-title h1 { margin: 0; color: #0369a1; font-size: 18px; line-height: 1.1; font-weight: 800; }
            .first-page-title h2 { margin: 0; color: #0369a1; font-size: 14px; line-height: 1.1; font-weight: 800; }
            .card { border: 1px solid #7dd3fc; margin: 6px 0; page-break-inside: auto; break-inside: auto; }
            .card h2 { margin: 0; background: #0891b2; color: #fff; padding: 5px 8px; font-size: 11px; }
            .hint { padding: 3px 8px; background: #f0f9ff; border-bottom: 1px solid #bae6fd; color: #334155; font-size: 8px; line-height: 1.2; }
            .grid3, .grid2 { display: grid; gap: 6px; padding: 6px 8px; }
            .grid3 { grid-template-columns: 1fr 1fr 1fr; }
            .grid2 { grid-template-columns: 1fr 1fr; }
            label { display: block; font-weight: 700; color: #334155; margin-bottom: 1px; font-size: 8px; }
            .value { min-height: 16px; border: 1px solid #bae6fd; padding: 3px 4px; background: #f8fdff; word-break: break-word; font-size: 9px; }
            .capital-table { table-layout: auto; }
            .capital-table td { text-align: center; font-weight: 700; font-size: 11px; padding: 6px 8px; }
            .tail-block { page-break-inside: avoid; break-inside: avoid; }
            .tail-block .card { margin: 6px 0; }
            .card.card--activities h2 {
              page-break-after: avoid;
              break-after: avoid;
            }
            .card.card--activities .hint {
              page-break-after: avoid;
              break-after: avoid;
            }
            .card.card--activities .longtext {
              page-break-before: avoid;
              break-before: avoid;
              page-break-inside: auto;
              break-inside: auto;
            }
            table { width: 100%; border-collapse: collapse; }
            thead { display: table-header-group; }
            th, td { border: 1px solid #7dd3fc; padding: 2px 3px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
            th { background: #ecfeff; font-size: 7.5px; text-align: center; line-height: 1.15; }

            /* Director blocks: card-per-director with 3-col grid */
            .director-block { border-bottom: 1.5px solid #bae6fd; }
            .director-block:last-child { border-bottom: none; }
            .director-num { background: #f0f9ff; padding: 3px 8px; font-weight: 700; font-size: 8.5px; color: #0369a1; border-bottom: 1px solid #e0f2fe; }
            .director-fields { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .director-fields td { padding: 2px 6px 3px; vertical-align: top; border: 1px solid #e0f2fe; }
            .director-fields .dl { font-size: 6.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2; }
            .director-fields .dv { font-size: 8.5px; color: #0f172a; min-height: 12px; word-break: break-word; overflow-wrap: anywhere; }

            /* Officers table: 5 columns, comfortable */
            .officers-table { table-layout: fixed; }
            .officers-table th { font-size: 8px; }
            .officers-table td { font-size: 8.5px; padding: 3px 4px; }

            /* Shareholders table: 6 columns */
            .shareholders-table { table-layout: fixed; }
            .shareholders-table th { font-size: 8px; }
            .shareholders-table td { font-size: 8px; padding: 2px 3px; }

            .longtext { padding: 6px 8px; min-height: 36px; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; font-size: 9px; }
            .card:last-child { page-break-inside: avoid; }
            ${layoutCss}
          </style>
        </head>
        <body class="${bodyGuardClass}">${content}</body>
        </html>
      `;

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await corporacionLayoutGuard.refineAfterRender(page);
      const chromePdf = corporacionLayoutGuard.getCorporacionPuppeteerPdfChromeOptions(
        corporacionLayoutGuard.LAYOUT,
        logoDataUri
      );
      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        scale: 1,
        ...chromePdf,
      });
      return Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);
    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = new CorporacionHtmlPdfService();
