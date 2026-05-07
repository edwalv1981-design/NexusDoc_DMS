const puppeteer = require('puppeteer');
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

function buildDirectorsRows(directors) {
  return directors.map((d, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc([d.firstName, d.secondName, d.lastName].filter(Boolean).join(' '))}</td>
      <td>${esc(fmtDate(d.birthDate))}</td>
      <td>${esc(d.maritalStatus)}</td>
      <td>${esc(d.nationality)}</td>
      <td>${esc(d.passport)}</td>
      <td>${esc(d.phone)}</td>
      <td>${esc(d.email)}</td>
      <td>${esc(d.address)}</td>
      <td>${esc(d.city)}</td>
      <td>${esc(d.country)}</td>
    </tr>
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

class CorporacionHtmlPdfService {
  async generatePdf(data = {}) {
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
      const dign = data.dignitaries || {};
      const capital = Number(String(data.capitalSocial || '10000').replace(/[^\d]/g, '')) || 10000;
      const capitalFmt = new Intl.NumberFormat('en-US').format(capital);

      const content = `
        <header class="page-header">
          ${logoDataUri ? `<img class="logo" src="${logoDataUri}" alt="Logo corporativo" />` : `<div class="logo-fallback">PANAMA TAX LAWYERS</div>`}
          <div class="header-titles">
            <h1>Incorporation Form / Formulario de Incorporación</h1>
            <p>Formulario corporativo dinámico y autocompletable</p>
          </div>
        </header>

        <section class="card">
          <h2>Name of the Corporation / Nombre de la Compañía</h2>
          <div class="hint">List the names you wish to use to incorporate your corporation in order of preference. / Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia.</div>
          <div class="grid3">
            <div><label>1st Choice (S.A.)</label><div class="value">${esc(data.corpNameSA)}</div></div>
            <div><label>2nd Choice (Corp.)</label><div class="value">${esc(data.corpNameCorp)}</div></div>
            <div><label>3rd Choice (Inc.)</label><div class="value">${esc(data.corpNameInc)}</div></div>
          </div>
        </section>

        <section class="card">
          <h2>Authorized Capital / Capital Social Autorizado</h2>
          <div class="hint">The minimum authorized capital of the company is US$10,000.00. / El capital mínimo autorizado de la sociedad es US$10,000.00.</div>
          <div class="capital"><span>Minimum:</span> <b>10,000 USD</b> <span>Authorized:</span> <b>${esc(capitalFmt)} USD</b></div>
        </section>

        <section class="card">
          <h2>Officers / Dignatarios</h2>
          <table>
            <thead><tr><th>Cargo</th><th>Full name / Nombre completo</th><th>Date of birth / Fecha de nacimiento</th><th>Passport / Pasaporte</th><th>Registration number / Registro</th></tr></thead>
            <tbody>
              <tr><td>President / Presidente</td><td>${esc(dign.presidente?.fullName)}</td><td>${esc(fmtDate(dign.presidente?.birthDate))}</td><td>${esc(dign.presidente?.passport)}</td><td>${esc(dign.presidente?.registrationNumber)}</td></tr>
              <tr><td>Secretary / Secretario</td><td>${esc(dign.secretario?.fullName)}</td><td>${esc(fmtDate(dign.secretario?.birthDate))}</td><td>${esc(dign.secretario?.passport)}</td><td>${esc(dign.secretario?.registrationNumber)}</td></tr>
              <tr><td>Treasurer / Tesorero</td><td>${esc(dign.tesorero?.fullName)}</td><td>${esc(fmtDate(dign.tesorero?.birthDate))}</td><td>${esc(dign.tesorero?.passport)}</td><td>${esc(dign.tesorero?.registrationNumber)}</td></tr>
            </tbody>
          </table>
        </section>

        <section class="card">
          <h2>Directors / Directores</h2>
          <div class="hint">In Panama, a minimum of 3 directors are required. / En Panamá se requieren mínimo 3 directores.</div>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Full name / Nombre</th><th>Date of birth</th><th>Marital status</th><th>Nationality</th><th>Passport</th><th>Phone</th><th>Email</th><th>Address</th><th>City</th><th>Country</th>
              </tr>
            </thead>
            <tbody>${buildDirectorsRows(directors)}</tbody>
          </table>
        </section>

        <section class="card">
          <h2>Shareholders / Accionistas</h2>
          <table>
            <thead><tr><th>#</th><th>Share certificate number</th><th>Share value</th><th>Number of shares</th><th>Shareholder</th><th>Address</th></tr></thead>
            <tbody>${buildShareholdersRows(shareholders)}</tbody>
          </table>
        </section>

        <section class="card">
          <h2>Company Activities / Actividades de la Compañía</h2>
          <div class="hint">Please provide an explanation of the corporation's activities. / Favor provea una explicación de la actividad de la sociedad.</div>
          <div class="longtext">${esc(data.companyActivities)}</div>
        </section>

        <section class="card">
          <h2>Declaration / Declaración</h2>
          <div class="hint">I hereby affirm that information given on this application is complete and accurate. / Declaro bajo juramento que la información es verdadera y correcta.</div>
          <div class="grid2">
            <div><label>Name / Nombre</label><div class="value">${esc(data.declarationName)}</div></div>
            <div><label>Date / Fecha</label><div class="value">${esc(fmtDate(data.declarationDate))}</div></div>
          </div>
        </section>
      `;

      const html = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 10px; margin: 0; }
            .page-header {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              background: #fff;
              margin-bottom: 10px;
            }
            .header-titles h1 { font-size: 16px; margin: 0; color: #0369a1; font-weight: 800; }
            .header-titles p { margin: 2px 0 0 0; color: #475569; font-size: 9px; }
            .logo { width: 160px; max-height: 52px; object-fit: contain; object-position: center; margin-bottom: 2px; }
            .logo-fallback { font-weight: 700; color: #94a3b8; margin-bottom: 8px; }
            .card { border: 1px solid #7dd3fc; margin: 10px 0; page-break-inside: avoid; break-inside: avoid; }
            .card h2 { margin: 0; background: #0891b2; color: #fff; padding: 6px 8px; font-size: 12px; }
            .hint { padding: 6px 8px; background: #f0f9ff; border-bottom: 1px solid #bae6fd; color: #334155; line-height: 1.35; }
            .grid3, .grid2 { display: grid; gap: 8px; padding: 8px; }
            .grid3 { grid-template-columns: 1fr 1fr 1fr; }
            .grid2 { grid-template-columns: 1fr 1fr; }
            label { display: block; font-weight: 700; color: #334155; margin-bottom: 2px; }
            .value { min-height: 18px; border: 1px solid #bae6fd; padding: 4px; background: #f8fdff; word-break: break-word; }
            .capital { padding: 10px; font-size: 12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            thead { display: table-header-group; }
            th, td { border: 1px solid #7dd3fc; padding: 3px 4px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
            th { background: #ecfeff; font-size: 9px; }
            .longtext { padding: 8px; min-height: 42px; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
            .card:last-child { page-break-inside: avoid; }
          </style>
        </head>
        <body>${content}</body>
        </html>
      `;

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      return await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = new CorporacionHtmlPdfService();
