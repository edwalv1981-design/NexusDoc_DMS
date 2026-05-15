const puppeteer = require('puppeteer');
const fundacionLayoutGuard = require('./fundacionLayoutGuard');
const fundacionPdfI18n = require('./fundacionPdfI18n');
const fs = require('fs');
const path = require('path');

function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

function buildFoundersRows(founders) {
  return founders.map((f, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(f.fullName)}</td>
      <td>${esc(fmtDate(f.birthDate))}</td>
      <td>${esc(f.passport)}</td>
      <td>${esc(f.address)}</td>
    </tr>
  `).join('');
}

function buildCouncilRows(members) {
  return members.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc([m.firstName, m.secondName, m.lastName].filter(Boolean).join(' '))}</td>
      <td>${esc(fmtDate(m.birthDate))}</td>
      <td>${esc(m.passport)}</td>
      <td>${esc(m.nationality)}</td>
      <td>${esc(m.address)}</td>
    </tr>
  `).join('');
}

function buildProtectorsRows(protectors) {
  return protectors.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(p.fullName)}</td>
      <td>${esc(fmtDate(p.birthDate))}</td>
      <td>${esc(p.passport)}</td>
    </tr>
  `).join('');
}

function buildBeneficiariesRows(beneficiaries) {
  return beneficiaries.map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(b.fullName)}</td>
      <td>${esc(fmtDate(b.birthDate))}</td>
      <td>${esc(b.passport)}</td>
      <td>${esc(b.percentage)}</td>
      <td>${esc(b.address)}</td>
    </tr>
  `).join('');
}

class FundacionHtmlPdfService {
  async generatePdf(data = {}, options = {}) {
    let browser = null;
    try {
      const rootDir = process.cwd().includes('server') ? path.join(process.cwd(), '..') : process.cwd();
      const founders = Array.isArray(data.founders) ? data.founders : [];
      const council = Array.isArray(data.councilMembers) ? data.councilMembers : [];
      const protectors = Array.isArray(data.protectors) ? data.protectors : [];
      const beneficiaries = Array.isArray(data.beneficiaries) ? data.beneficiaries : [];
      const dignitaries = Array.isArray(data.dignitaries) ? data.dignitaries : [];
      const signers = Array.isArray(data.signers) ? data.signers : [];

      const lang = fundacionPdfI18n.normalizeLanguage(options.language || data.language);
      const t = fundacionPdfI18n.getFundacionPdfDict(lang);
      const plan = fundacionLayoutGuard.analyzeFormData(data);

      const content = `
        <main class="doc-body">
          <section class="card">
            <div class="first-page-title"><h1>${esc(t.docTitle)}</h1></div>
            <h2>${esc(t.sectionName)}</h2>
            <div class="hint">${esc(t.sectionNameHint)}</div>
            <div class="grid3">
              <div><label>${esc(t.choice1)}</label><div class="value">${esc(data.foundationNameOption1)}</div></div>
              <div><label>${esc(t.choice2)}</label><div class="value">${esc(data.foundationNameOption2)}</div></div>
              <div><label>${esc(t.choice3)}</label><div class="value">${esc(data.foundationNameOption3)}</div></div>
            </div>
          </section>

          <section class="card">
            <h2>${esc(t.sectionCapital)}</h2>
            <div class="hint">${esc(t.sectionCapitalHint)}</div>
            <div class="grid2">
              <div><label>${esc(t.capitalMin)}</label><div class="value">10,000 USD</div></div>
              <div><label>${esc(t.capitalAuth)}</label><div class="value">${esc(data.initialPatrimony)} USD</div></div>
            </div>
          </section>

          <section class="card">
            <h2>${esc(t.sectionFounders)}</h2>
            <table>
              <thead><tr><th>#</th><th>${esc(t.founderName)}</th><th>${esc(t.founderBirthDate)}</th><th>${esc(t.founderPassport)}</th><th>${esc(t.founderAddress)}</th></tr></thead>
              <tbody>${buildFoundersRows(founders)}</tbody>
            </table>
          </section>

          <section class="card">
            <h2>${esc(t.sectionCouncil)}</h2>
            <table>
              <thead><tr><th>#</th><th>${esc(t.councilFullName)}</th><th>${esc(t.councilBirthDate)}</th><th>${esc(t.councilPassport)}</th><th>Nacionalidad</th><th>Dirección</th></tr></thead>
              <tbody>${buildCouncilRows(council)}</tbody>
            </table>
          </section>

          <section class="card">
            <h2>${esc(t.sectionProtectors)}</h2>
            <table>
              <thead><tr><th>#</th><th>${esc(t.protectorName)}</th><th>F. Nacimiento</th><th>${esc(t.protectorPassport)}</th></tr></thead>
              <tbody>${buildProtectorsRows(protectors)}</tbody>
            </table>
          </section>

          <section class="card">
            <h2>Dignatarios</h2>
            <table>
              <thead><tr><th>Cargo</th><th>Nombre Completo</th><th>Pasaporte</th></tr></thead>
              <tbody>
                ${dignitaries.map(d => `<tr><td>${esc(d.role)}</td><td>${esc(d.fullName)}</td><td>${esc(d.passport)}</td></tr>`).join('')}
              </tbody>
            </table>
          </section>

          <section class="card">
            <h2>${esc(t.sectionBeneficiaries)}</h2>
            <table>
              <thead><tr><th>#</th><th>${esc(t.beneficiaryName)}</th><th>F. Nacimiento</th><th>Pasaporte</th><th>${esc(t.beneficiaryPercentage)}</th><th>Dirección</th></tr></thead>
              <tbody>${buildBeneficiariesRows(beneficiaries)}</tbody>
            </table>
          </section>

          <section class="card">
            <h2>${esc(t.sectionActivities)}</h2>
            <div class="hint">${esc(t.sectionActivitiesHint)}</div>
            <div class="longtext">${esc(data.foundationObjects)}</div>
          </section>

          <section class="card">
            <h2>${esc(t.sectionDeclaration)}</h2>
            <div class="hint">${esc(t.sectionDeclarationHint)}</div>
            <div style="padding: 10px;">
              ${signers.map(s => `
                <div style="margin-bottom: 15px;">
                  <label>${esc(t.declarationSignature)}</label><div class="value">${esc(s.signature)}</div>
                  <label style="margin-top:5px;">${esc(t.declarationName)}</label><div class="value">${esc(s.name)}</div>
                </div>
              `).join('')}
              <label>${esc(t.declarationDate)}</label><div class="value">${esc(fmtDate(data.declarationDate))}</div>
            </div>
          </section>
        </main>
      `;

      const html = `
        <!doctype html>
        <html>
        <head>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 0; }
            .doc-body { padding: 0; }
            .first-page-title { text-align: center; margin-bottom: 20px; }
            .first-page-title h1 { color: #4f46e5; font-size: 22px; margin: 0; }
            .card { border: 1px solid #e2e8f0; margin-bottom: 15px; page-break-inside: avoid; }
            .card h2 { background: #4f46e5; color: white; margin: 0; padding: 8px; font-size: 12px; }
            .hint { background: #f8fafc; padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-style: italic; color: #64748b; }
            .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 10px; }
            .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px; }
            label { font-weight: bold; font-size: 9px; color: #64748b; display: block; margin-bottom: 2px; }
            .value { border: 1px solid #f1f5f9; background: #fcfcfc; padding: 5px; min-height: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 4px; text-align: left; }
            th { background: #f8fafc; font-size: 9px; }
            .longtext { padding: 10px; white-space: pre-wrap; }
          </style>
        </head>
        <body>${content}</body>
        </html>
      `;

      browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdfBytes = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdfBytes);
    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = new FundacionHtmlPdfService();
