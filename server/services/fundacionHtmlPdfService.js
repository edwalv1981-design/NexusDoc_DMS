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

      // Mapeo dinámico de poderes
      let powersHtml = '';
      const hasPowers = data.hasPowers === 'yes' || data.hasPowers === true;
      if (hasPowers) {
        const typeLabel = data.powerType === 'general' ? (lang === 'es' ? 'Poder General' : 'General Power of Attorney') : (lang === 'es' ? 'Poder Especial' : 'Special Power of Attorney');
        
        // Mapeo de facultades estándar seleccionadas
        const activePowers = [];
        if (data.powerScopeBanks) activePowers.push(lang === 'es' ? 'Representar ante entidades bancarias' : 'Represent the foundation before banking entities');
        if (data.powerScopeAccounts) activePowers.push(lang === 'es' ? 'Abrir y manejar cuentas bancarias' : 'Open and operate bank accounts');
        if (data.powerScopeRealEstate) activePowers.push(lang === 'es' ? 'Administrar bienes inmuebles y muebles' : 'Administer real estate and personal assets');
        if (data.powerScopeContracts) activePowers.push(lang === 'es' ? 'Firmar contratos y convenios' : 'Sign contracts and agreements');
        if (data.powerScopeCourts) activePowers.push(lang === 'es' ? 'Comparecer ante tribunales y autoridades' : 'Appear before courts and public authorities');

        powersHtml = `
          <div class="powers-container">
            <div class="powers-meta">
              <div><strong>${esc(t.powerType)}:</strong> <span class="badge-blue">${esc(typeLabel)}</span></div>
            </div>
            <div style="margin-top: 15px;">
              <h3>${esc(t.powerHolder)}</h3>
              <div class="grid3" style="padding: 0; margin-top: 5px;">
                <div><label>${esc(t.powerHolderName)}</label><div class="value">${esc(data.powerHolderName)}</div></div>
                <div><label>${esc(t.powerHolderPassport)}</label><div class="value">${esc(data.powerHolderPassport)}</div></div>
                <div><label>${esc(t.powerHolderAddress)}</label><div class="value">${esc(data.powerHolderAddress)}</div></div>
              </div>
            </div>
            ${activePowers.length > 0 ? `
              <div style="margin-top: 15px;">
                <strong>${esc(t.powerScope)}:</strong>
                <ul class="powers-list">
                  ${activePowers.map(p => `<li>✅ ${esc(p)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${data.powerDescription ? `
              <div style="margin-top: 15px;">
                <strong>${esc(t.powerScopeCustom)}:</strong>
                <div class="value-block" style="white-space: pre-wrap;">${esc(data.powerDescription)}</div>
              </div>
            ` : ''}
          </div>
        `;
      } else {
        powersHtml = `
          <div class="no-powers-message">
            🚫 ${lang === 'es' ? 'No se otorgan poderes de representación en este trámite.' : 'No representation powers granted in this registration.'}
          </div>
        `;
      }

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

          <!-- 8. PODERES -->
          <section class="card">
            <h2>${esc(t.sectionPowers)}</h2>
            <div style="padding: 12px;">
              ${powersHtml}
            </div>
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
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 0; background: #fff; }
            .doc-body { padding: 0; }
            .first-page-title { text-align: center; margin-bottom: 25px; }
            .first-page-title h1 { color: #0078d4; font-size: 24px; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .card { border: 1px solid #e2e8f0; margin-bottom: 20px; page-break-inside: avoid; border-radius: 4px; overflow: hidden; }
            .card h2 { background: #0078d4; color: white; margin: 0; padding: 10px 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .hint { background: #f8fafc; padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-style: italic; color: #64748b; font-size: 9px; }
            .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 12px; }
            .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; }
            label { font-weight: 700; font-size: 8.5px; color: #475569; display: block; margin-bottom: 4px; text-transform: uppercase; }
            .value { border: 1px solid #e2e8f0; background: #f8fafc; padding: 6px 8px; min-height: 15px; border-radius: 3px; font-size: 9.5px; color: #0f172a; }
            .value-block { border: 1px solid #e2e8f0; background: #f8fafc; padding: 8px 12px; border-radius: 3px; font-size: 9.5px; color: #0f172a; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin: 0; }
            th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
            th { background: #f1f5f9; font-weight: 700; font-size: 8.5px; color: #475569; text-transform: uppercase; }
            td { font-size: 9.5px; color: #0f172a; }
            .longtext { padding: 12px; white-space: pre-wrap; line-height: 1.5; font-size: 9.5px; color: #0f172a; }
            .powers-container { background: #ffffff; border-radius: 4px; }
            .badge-blue { background: #eff6ff; color: #0078d4; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 9px; display: inline-block; }
            .powers-list { margin: 8px 0 0 0; padding-left: 20px; list-style-type: none; }
            .powers-list li { margin-bottom: 6px; font-size: 9.5px; }
            .no-powers-message { color: #64748b; font-style: italic; text-align: center; padding: 15px; background: #f8fafc; border-radius: 4px; border: 1px dashed #e2e8f0; font-size: 10px; }
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
