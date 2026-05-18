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
  if (!founders || founders.length === 0) return '<tr><td colspan="5" style="text-align:center;font-style:italic;">No founders declared / Sin fundadores declarados</td></tr>';
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
  if (!members || members.length === 0) return '<tr><td colspan="6" style="text-align:center;font-style:italic;">No council members declared / Sin miembros del consejo declarados</td></tr>';
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
  if (!protectors || protectors.length === 0) return '<tr><td colspan="4" style="text-align:center;font-style:italic;">No protectors declared / Sin protectores declarados</td></tr>';
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
  if (!beneficiaries || beneficiaries.length === 0) return '<tr><td colspan="6" style="text-align:center;font-style:italic;">No beneficiaries declared / Sin beneficiarios declarados</td></tr>';
  return beneficiaries.map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(b.fullName)}</td>
      <td>${esc(fmtDate(b.birthDate))}</td>
      <td>${esc(b.passport)}</td>
      <td>${esc(b.percentage)}%</td>
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

      // Render exact original POA tables
      const poaIssueYes = data.poaIssue === 'YES';
      const poaIssueNo = data.poaIssue === 'NO' || !data.poaIssue;
      const poaLegalizedYes = data.poaLegalized === 'YES';
      const poaLegalizedNo = data.poaLegalized === 'NO' || !data.poaLegalized;
      const poaTypeLabel = String(data.poaType || 'GENERAL').toUpperCase();

      const powersHtml = `
        <div class="poa-section-container">
          <div class="poa-header-title">
            Power Of Attorney / Poderes (Optional)
          </div>
          
          <div class="poa-body-grid">
            <!-- Left Column: Apoderado Details -->
            <div class="poa-col-left">
              <table class="poa-table">
                <thead>
                  <tr>
                    <th colspan="2" class="poa-table-header">
                      Name, Address of the person who's the POA is granted and the acting form (Individual, Jointly, etc.)<br/>
                      Nombre, Dirección del Apoderado y forma en que ejercerá el Poder (Individual, Conjunta, etc.)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="poa-label">First name / Nombre</td>
                    <td class="poa-val">${esc(data.poaFirstName)}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">Middle name / Segundo nombre</td>
                    <td class="poa-val">${esc(data.poaMiddleName)}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">Surname(s) / Apellidos</td>
                    <td class="poa-val">${esc(data.poaLastName)}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">Date of birth/ Fecha de nacimiento</td>
                    <td class="poa-val">${esc(fmtDate(data.poaBirthDate))}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">Marital Status / Estado civil</td>
                    <td class="poa-val">${esc(data.poaMaritalStatus)}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">Citizenship / Nacionalidad</td>
                    <td class="poa-val">${esc(data.poaNationality)}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">Passport / Pasaporte</td>
                    <td class="poa-val">${esc(data.poaPassport)}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">ID</td>
                    <td class="poa-val">${esc(data.poaIdCard)}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">Phone / Teléfono</td>
                    <td class="poa-val">${esc(data.poaPhone)}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">Email</td>
                    <td class="poa-val">${esc(data.poaEmail)}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">Address / Dirección</td>
                    <td class="poa-val">${esc(data.poaAddress)}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">City / ciudad</td>
                    <td class="poa-val">${esc(data.poaCity)}</td>
                  </tr>
                  <tr>
                    <td class="poa-label">Country / Pais</td>
                    <td class="poa-val">${esc(data.poaCountry)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Right Column: Settings & Questions -->
            <div class="poa-col-right">
              <table class="poa-table">
                <tbody>
                  <tr>
                    <td class="poa-label-q">
                      Would you like to issue a Power of Attorney?<br/>
                      Quiere Usted emitir un poder?
                    </td>
                    <td class="poa-check-val">
                      <span class="chk-box">${poaIssueYes ? '☑' : '☐'} YES</span>
                      <span class="chk-box" style="margin-left: 10px;">${poaIssueNo ? '☑' : '☐'} NO</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="poa-label-q">
                      If Yes please select type of Power of Attorney
                    </td>
                    <td class="poa-val" style="font-weight: bold; text-align: center;">
                      ${esc(poaTypeLabel)}
                    </td>
                  </tr>
                  <tr>
                    <td class="poa-label-q">
                      Validity date/ Fecha de vigencia:
                    </td>
                    <td class="poa-val">
                      ${esc(data.poaValidityDate)}
                    </td>
                  </tr>
                  <tr>
                    <td class="poa-label-q">
                      Would you require the POA to be legalized?<br/>
                      Requiere que el poder sea legalizado?
                    </td>
                    <td class="poa-check-val">
                      <span class="chk-box">${poaLegalizedYes ? '☑' : '☐'} YES</span>
                      <span class="chk-box" style="margin-left: 10px;">${poaLegalizedNo ? '☑' : '☐'} NO</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      const content = `
        <main class="doc-body">
          <!-- 1. NOMBRE DE LA FUNDACION -->
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

          <!-- 2. CAPITAL SOCIAL -->
          <section class="card">
            <h2>${esc(t.sectionCapital)}</h2>
            <div class="hint">${esc(t.sectionCapitalHint)}</div>
            <div class="grid2">
              <div><label>${esc(t.capitalMin)}</label><div class="value">10,000 USD</div></div>
              <div><label>${esc(t.capitalAuth)}</label><div class="value">${esc(data.initialPatrimony)} USD</div></div>
            </div>
          </section>

          <!-- 3. FUNDADORES -->
          <section class="card">
            <h2>${esc(t.sectionFounders)}</h2>
            <table>
              <thead><tr><th>#</th><th>${esc(t.founderName)}</th><th>${esc(t.founderBirthDate)}</th><th>${esc(t.founderPassport)}</th><th>${esc(t.founderAddress)}</th></tr></thead>
              <tbody>${buildFoundersRows(founders)}</tbody>
            </table>
          </section>

          <!-- 4. PROTECTORES -->
          <section class="card">
            <h2>${esc(t.sectionProtectors)}</h2>
            <table>
              <thead><tr><th>#</th><th>${esc(t.protectorName)}</th><th>F. Nacimiento / D.O.B</th><th>${esc(t.protectorPassport)}</th></tr></thead>
              <tbody>${buildProtectorsRows(protectors)}</tbody>
            </table>
          </section>

          <!-- 5. DIRECTORES -->
          <section class="card">
            <h2>${esc(t.sectionCouncil)}</h2>
            <table>
              <thead><tr><th>#</th><th>${esc(t.councilFullName)}</th><th>${esc(t.councilBirthDate)}</th><th>${esc(t.councilPassport)}</th><th>Nacionalidad</th><th>Dirección</th></tr></thead>
              <tbody>${buildCouncilRows(council)}</tbody>
            </table>
          </section>

          <!-- 6. DIGNATARIOS -->
          <section class="card">
            <h2>Dignatarios / Dignitaries</h2>
            <table>
              <thead><tr><th>Cargo / Role</th><th>Nombre Completo / Full Name</th><th>Pasaporte / Passport</th></tr></thead>
              <tbody>
                ${dignitaries.length > 0 ? dignitaries.map(d => `<tr><td>${esc(d.role)}</td><td>${esc(d.fullName)}</td><td>${esc(d.passport)}</td></tr>`).join('') : '<tr><td colspan="3" style="text-align:center;font-style:italic;">No dignitaries declared / Sin dignatarios declarados</td></tr>'}
              </tbody>
            </table>
          </section>

          <!-- 7. BENEFICIARIOS -->
          <section class="card">
            <h2>${esc(t.sectionBeneficiaries)}</h2>
            <table>
              <thead><tr><th>#</th><th>${esc(t.beneficiaryName)}</th><th>F. Nacimiento / D.O.B</th><th>Pasaporte / ID</th><th>${esc(t.beneficiaryPercentage)}</th><th>Dirección</th></tr></thead>
              <tbody>${buildBeneficiariesRows(beneficiaries)}</tbody>
            </table>
          </section>

          <!-- 8. PODERES (Original Layout) -->
          <section class="card" style="page-break-inside: avoid;">
            ${powersHtml}
          </section>

          <!-- 9. ACTIVIDADES DE LA FUNDACION -->
          <section class="card">
            <h2>${esc(t.sectionActivities)}</h2>
            <div class="hint">${esc(t.sectionActivitiesHint)}</div>
            <div class="longtext">${esc(data.foundationObjects)}</div>
          </section>

          <!-- 10. DECLARACIONES -->
          <section class="card">
            <h2>${esc(t.sectionDeclaration)}</h2>
            <div class="hint">${esc(t.sectionDeclarationHint)}</div>
            <div style="padding: 12px;">
              ${signers.map(s => `
                <div style="margin-bottom: 15px; border-bottom: 1px dashed #f1f5f9; padding-bottom: 10px;">
                  <label>${esc(t.declarationSignature)}</label><div class="value" style="font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 11px; color: #0078d4;">${esc(s.signature)}</div>
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
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; color: #1e293b; margin: 0; padding: 0; background: #fff; }
            .doc-body { padding: 0; }
            .first-page-title { text-align: center; margin-bottom: 20px; }
            .first-page-title h1 { color: #0078d4; font-size: 20px; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .card { border: 1px solid #0078d4; margin-bottom: 15px; page-break-inside: avoid; border-radius: 4px; overflow: hidden; }
            .card h2 { background: #0078d4; color: white; margin: 0; padding: 8px 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .hint { background: #f8fafc; padding: 5px 10px; border-bottom: 1px solid #e2e8f0; font-style: italic; color: #64748b; font-size: 8px; }
            .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 10px; }
            .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px; }
            label { font-weight: 700; font-size: 8px; color: #475569; display: block; margin-bottom: 3px; text-transform: uppercase; }
            .value { border: 1px solid #e2e8f0; background: #f8fafc; padding: 5px 8px; min-height: 12px; border-radius: 3px; font-size: 9px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin: 0; }
            th, td { border: 1px solid #e2e8f0; padding: 5px 8px; text-align: left; }
            th { background: #f1f5f9; font-weight: 700; font-size: 8px; color: #475569; text-transform: uppercase; }
            td { font-size: 8.5px; color: #0f172a; }
            .longtext { padding: 10px; white-space: pre-wrap; line-height: 1.4; font-size: 8.5px; color: #0f172a; }
            
            /* ORIGINAL POWER OF ATTORNEY SECTION STYLES */
            .poa-section-container { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; width: 100%; }
            .poa-header-title { background: #40a2be; color: white; padding: 10px 15px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
            .poa-body-grid { display: flex; width: 100%; border-top: 1px solid #40a2be; }
            .poa-col-left { width: 55%; border-right: 2px solid #cbd5e1; }
            .poa-col-right { width: 45%; }
            .poa-table { width: 100%; border-collapse: collapse; }
            .poa-table td, .poa-table th { border: 1px solid #40a2be; padding: 6px 10px; font-size: 9px; }
            .poa-table-header { background: #eff6ff; font-weight: bold; font-size: 8.5px; text-align: left; color: #1e3a8a; line-height: 1.3; }
            .poa-label { background: #ffffff; width: 40%; font-weight: bold; color: #475569; }
            .poa-label-q { background: #ffffff; width: 60%; font-weight: bold; color: #475569; line-height: 1.3; }
            .poa-val { background: #fcfdfe; color: #0f172a; }
            .poa-check-val { background: #fcfdfe; color: #0f172a; font-weight: bold; font-size: 9.5px; }
            .chk-box { display: inline-flex; align-items: center; }
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
