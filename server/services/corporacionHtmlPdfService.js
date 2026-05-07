const puppeteer = require('puppeteer');

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

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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
      const directors = Array.isArray(data.directors) ? data.directors : [];
      const shareholders = Array.isArray(data.shareholders) ? data.shareholders : [];
      const dign = data.dignitaries || {};
      const capital = Number(String(data.capitalSocial || '10000').replace(/[^\d]/g, '')) || 10000;
      const capitalFmt = new Intl.NumberFormat('en-US').format(capital);

      const dirChunks = chunk(directors, 18);
      const shChunks = chunk(shareholders, 22);

      const pages = [];
      pages.push(`
        <section class="page">
          <header>
            <h1>Incorporation Form / Formulario de Incorporacion</h1>
            <p>Corporacion - Formato dinamico autorellenable</p>
          </header>
          <div class="card">
            <h2>Nombres de la compania</h2>
            <div class="grid3">
              <div><label>1ra opcion (S.A.)</label><div class="value">${esc(data.corpNameSA)}</div></div>
              <div><label>2da opcion (Corp.)</label><div class="value">${esc(data.corpNameCorp)}</div></div>
              <div><label>3ra opcion (Inc.)</label><div class="value">${esc(data.corpNameInc)}</div></div>
            </div>
          </div>
          <div class="card">
            <h2>Capital social autorizado</h2>
            <div class="capital"><span>Minimo:</span> <b>10,000 USD</b> <span>Autorizado:</span> <b>${esc(capitalFmt)} USD</b></div>
          </div>
          <div class="card">
            <h2>Dignatarios</h2>
            <table>
              <thead><tr><th>Cargo</th><th>Nombre completo</th><th>Nacimiento</th><th>Pasaporte</th><th>Registro</th></tr></thead>
              <tbody>
                <tr><td>Presidente</td><td>${esc(dign.presidente?.fullName)}</td><td>${esc(fmtDate(dign.presidente?.birthDate))}</td><td>${esc(dign.presidente?.passport)}</td><td>${esc(dign.presidente?.registrationNumber)}</td></tr>
                <tr><td>Secretario</td><td>${esc(dign.secretario?.fullName)}</td><td>${esc(fmtDate(dign.secretario?.birthDate))}</td><td>${esc(dign.secretario?.passport)}</td><td>${esc(dign.secretario?.registrationNumber)}</td></tr>
                <tr><td>Tesorero</td><td>${esc(dign.tesorero?.fullName)}</td><td>${esc(fmtDate(dign.tesorero?.birthDate))}</td><td>${esc(dign.tesorero?.passport)}</td><td>${esc(dign.tesorero?.registrationNumber)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      `);

      if (dirChunks.length === 0) dirChunks.push([]);
      dirChunks.forEach((block, idx) => {
        pages.push(`
          <section class="page">
            <div class="card">
              <h2>Directores ${idx > 0 ? `(continuacion ${idx + 1})` : ''}</h2>
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Nombre</th><th>Nacimiento</th><th>Estado civil</th><th>Nacionalidad</th><th>Pasaporte</th><th>Telefono</th><th>Email</th><th>Direccion</th><th>Ciudad</th><th>Pais</th>
                  </tr>
                </thead>
                <tbody>${buildDirectorsRows(block)}</tbody>
              </table>
            </div>
          </section>
        `);
      });

      if (shChunks.length === 0) shChunks.push([]);
      shChunks.forEach((block, idx) => {
        pages.push(`
          <section class="page">
            <div class="card">
              <h2>Accionistas ${idx > 0 ? `(continuacion ${idx + 1})` : ''}</h2>
              <table>
                <thead><tr><th>#</th><th>Certificado</th><th>Valor</th><th>Acciones</th><th>Nombre</th><th>Direccion</th></tr></thead>
                <tbody>${buildShareholdersRows(block)}</tbody>
              </table>
            </div>
            <div class="card">
              <h2>Actividades de la compania</h2>
              <div class="longtext">${esc(data.companyActivities)}</div>
            </div>
            <div class="card">
              <h2>Declaracion</h2>
              <div class="grid2">
                <div><label>Nombre</label><div class="value">${esc(data.declarationName)}</div></div>
                <div><label>Fecha</label><div class="value">${esc(fmtDate(data.declarationDate))}</div></div>
              </div>
            </div>
          </section>
        `);
      });

      const html = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 10px; margin: 0; }
            .page { page-break-after: always; }
            .page:last-child { page-break-after: auto; }
            header h1 { font-size: 18px; margin: 0; color: #0369a1; }
            header p { margin: 4px 0 10px 0; color: #475569; }
            .card { border: 1px solid #7dd3fc; margin: 8px 0; }
            .card h2 { margin: 0; background: #0891b2; color: #fff; padding: 6px 8px; font-size: 12px; }
            .grid3, .grid2 { display: grid; gap: 8px; padding: 8px; }
            .grid3 { grid-template-columns: 1fr 1fr 1fr; }
            .grid2 { grid-template-columns: 1fr 1fr; }
            label { display: block; font-weight: 700; color: #334155; margin-bottom: 2px; }
            .value { min-height: 18px; border: 1px solid #bae6fd; padding: 4px; background: #f8fdff; word-break: break-word; }
            .capital { padding: 10px; font-size: 12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #7dd3fc; padding: 3px 4px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
            th { background: #ecfeff; font-size: 9px; }
            .longtext { padding: 8px; min-height: 42px; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
          </style>
        </head>
        <body>${pages.join('\n')}</body>
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
