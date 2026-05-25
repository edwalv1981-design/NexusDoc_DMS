const puppeteer = require('puppeteer');
const fundacionLayoutGuard = require('./fundacionLayoutGuard');
const fundacionPdfI18n = require('./fundacionPdfI18n');
const {
  normalizeFundacionPerson,
  personDisplayName,
  dignitaryDisplayName,
  beneficiaryDisplayName,
  personHasData,
} = require('../utils/fundacionPersonSchema');
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
  if (data.founder && typeof data.founder === 'object') return normalizeFundacionPerson(data.founder);
  const founders = Array.isArray(data.founders) ? data.founders : [];
  return normalizeFundacionPerson(founders[0] || {});
}

function personFieldRows(person, t, { includeEmpty = false } = {}) {
  const p = normalizeFundacionPerson(person);
  const fullName = p.fullName || [p.firstName, p.secondName, p.lastName].filter(Boolean).join(' ');
  const rows = [
    [t.poaFullName || 'Full name / Nombre completo', fullName],
    [t.poaBirthDate, fmtDate(p.birthDate)],
    [t.poaMaritalStatus, p.maritalStatus],
    [t.poaNationality, p.nationality],
    [t.poaPassport, p.passport],
    [t.poaIdCard, p.idCard],
    [t.poaPhone, p.phone],
    [t.poaEmail, p.email],
    [t.poaAddress, p.address],
    [t.poaCity, p.city],
    [t.poaCountry, p.country],
  ];
  const visible = includeEmpty ? rows : rows.filter(([, v]) => v);
  return visible
    .map(([label, value]) => {
      const display = value || (includeEmpty ? '—' : '');
      return `<tr><td class="kv-label">${esc(label)}</td><td>${esc(display)}</td></tr>`;
    })
    .join('');
}

function normalizeYesNoFlag(value) {
  if (value === true || value === 1) return 'YES';
  if (value === false || value === 0) return 'NO';
  const s = String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (['YES', 'SI', 'Y', 'S', 'TRUE'].includes(s)) return 'YES';
  if (['NO', 'N', 'FALSE'].includes(s)) return 'NO';
  return '';
}

/** Maps form JSON / legacy aliases to canonical poa* keys used by the form. */
function normalizeFundacionPoaData(data = {}) {
  const nested = data.poa && typeof data.poa === 'object' ? data.poa : {};
  const pick = (...keys) => {
    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') return data[key];
      if (nested[key] !== undefined && nested[key] !== null && nested[key] !== '') return nested[key];
    }
    return undefined;
  };

  const poaFirstName = pick('poaFirstName', 'firstName') || '';
  const poaMiddleName = pick('poaMiddleName', 'middleName', 'secondName') || '';
  const poaLastName = pick('poaLastName', 'lastName') || '';
  const poaFullName = pick('poaFullName', 'fullName') || [poaFirstName, poaMiddleName, poaLastName].filter(Boolean).join(' ');

  return {
    poaIssue: normalizeYesNoFlag(pick('poaIssue', 'issuePower', 'emitirPoder', 'issue_poa')),
    poaType: String(pick('poaType', 'powerType', 'tipoPoder', 'tipo_poder') || 'GENERAL').toUpperCase(),
    poaValidityDate: pick('poaValidityDate', 'validityDate', 'fechaVigencia', 'vigencia') || '',
    poaLegalized: normalizeYesNoFlag(pick('poaLegalized', 'legalize', 'legalized', 'legalizacion')),
    poaFullName,
    poaBirthDate: pick('poaBirthDate', 'birthDate') || '',
    poaMaritalStatus: pick('poaMaritalStatus', 'maritalStatus') || '',
    poaNationality: pick('poaNationality', 'nationality') || '',
    poaPassport: pick('poaPassport', 'passport') || '',
    poaIdCard: pick('poaIdCard', 'idCard') || '',
    poaPhone: pick('poaPhone', 'phone') || '',
    poaEmail: pick('poaEmail', 'email') || '',
    poaAddress: pick('poaAddress', 'address') || '',
    poaCity: pick('poaCity', 'city') || '',
    poaCountry: pick('poaCountry', 'country') || '',
  };
}

function formatYesNoChecks(yesSelected, noSelected, t) {
  const yesMark = yesSelected ? 'X' : ' ';
  const noMark = noSelected ? 'X' : ' ';
  return `<span class="chk">[${yesMark}] ${esc(t.yes)}</span> <span class="chk">[${noMark}] ${esc(t.no)}</span>`;
}

function poaTypeLabel(type, t) {
  const normalized = String(type || 'GENERAL').toUpperCase();
  if (normalized === 'SPECIAL') return t.poaTypeSpecial || 'SPECIAL';
  return t.poaTypeGeneral || 'GENERAL';
}

function buildPersonKvBlock(person, t, blockTitle) {
  const p = normalizeFundacionPerson(person);
  if (!personHasData(p)) return '';
  const rows = personFieldRows(p, t, { includeEmpty: true });
  if (!rows) return '';
  return `
    <div class="person-block">
      <div class="person-block-title">${esc(blockTitle)}</div>
      <table class="kv-table"><tbody>${rows}</tbody></table>
    </div>
  `;
}

function buildPersonStackSection(sectionTitle, people, t, emptyMsg, roleSingular, hintHtml = '') {
  const list = (Array.isArray(people) ? people : []).map(normalizeFundacionPerson).filter(personHasData);
  const blocks =
    list.length > 0
      ? list
          .map((p, i) => {
            const title =
              list.length > 1 ? `${roleSingular} #${i + 1} — ${personDisplayName(p)}` : roleSingular;
            return buildPersonKvBlock(p, t, title);
          })
          .join('')
      : `<p class="empty-msg">${esc(emptyMsg)}</p>`;
  return `
    <section class="card person-stack-section">
      <h2>${esc(sectionTitle)}</h2>
      ${hintHtml}
      ${blocks}
    </section>
  `;
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
    .map((m, i) => {
      const row = normalizeFundacionPerson(m);
      return `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(personDisplayName(row))}</td>
      <td>${esc(fmtDate(row.birthDate))}</td>
      <td>${esc(row.maritalStatus)}</td>
      <td>${esc(row.nationality)}</td>
      <td>${esc(row.passport || row.idCard)}</td>
      <td>${esc(row.address)}</td>
      <td>${esc(row.city)}</td>
      <td>${esc(row.country)}</td>
    </tr>
  `;
    })
    .join('');
}

function buildProtectorsRows(protectors, t) {
  if (!protectors.length) {
    return `<tr><td colspan="5" style="text-align:center;font-style:italic;">${esc(t.emptyProtectors)}</td></tr>`;
  }
  return protectors
    .map((p, i) => {
      const row = normalizeFundacionPerson(p);
      return `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(personDisplayName(row))}</td>
      <td>${esc(fmtDate(row.birthDate))}</td>
      <td>${esc(row.passport || row.idCard)}</td>
      <td>${esc(row.address)}</td>
    </tr>
  `;
    })
    .join('');
}

function buildDignitariesRows(dignitaries, t) {
  if (!dignitaries.length) {
    return `<tr><td colspan="4" style="text-align:center;font-style:italic;">${esc(t.emptyDignitaries)}</td></tr>`;
  }
  return dignitaries
    .map((d) => {
      const address = d.address || normalizeFundacionPerson(d).address;
      return `
    <tr>
      <td>${esc(d.role)}</td>
      <td>${esc(dignitaryDisplayName(d))}</td>
      <td>${esc(fmtDate(d.birthDate))}</td>
      <td>${esc(address)}</td>
    </tr>
  `;
    })
    .join('');
}

function buildBeneficiariesRows(beneficiaries, t) {
  if (!beneficiaries.length) {
    return `<tr><td colspan="4" style="text-align:center;font-style:italic;">${esc(t.emptyBeneficiaries)}</td></tr>`;
  }
  return beneficiaries
    .map((b) => {
      const address = b.address || normalizeFundacionPerson(b).address;
      return `
    <tr>
      <td>${esc(b.percentage)}</td>
      <td>${esc(beneficiaryDisplayName(b))}</td>
      <td>${esc(fmtDate(b.birthDate))}</td>
      <td>${esc(address)}</td>
    </tr>
  `;
    })
    .join('');
}

function buildPowersHtml(data, t) {
  const poa = normalizeFundacionPoaData(data);
  const poaIssueYes = poa.poaIssue === 'YES';
  const poaIssueNo = poa.poaIssue === 'NO' || !poa.poaIssue;
  const poaLegalizedYes = poa.poaLegalized === 'YES';
  const poaLegalizedNo = poa.poaLegalized === 'NO' || !poa.poaLegalized;
  const typeLabel = poaTypeLabel(poa.poaType, t);
  const grantee = normalizeFundacionPerson({
    fullName: poa.poaFullName,
    birthDate: poa.poaBirthDate,
    maritalStatus: poa.poaMaritalStatus,
    nationality: poa.poaNationality,
    passport: poa.poaPassport,
    idCard: poa.poaIdCard,
    phone: poa.poaPhone,
    email: poa.poaEmail,
    address: poa.poaAddress,
    city: poa.poaCity,
    country: poa.poaCountry,
  });
  const granteeRows = personFieldRows(grantee, t, { includeEmpty: true });

  return `
    <section class="card card--poa person-stack-section">
      <h2>${esc(t.sectionPowers)}</h2>
      <div class="poa-stack">
        <div class="person-block">
          <div class="person-block-title">${esc(t.poaHeaderGrantee)}</div>
          <table class="kv-table"><tbody>${granteeRows}</tbody></table>
        </div>
        <div class="person-block poa-settings-block">
          <div class="person-block-title">${esc(t.poaSettingsHeader)}</div>
          <table class="kv-table">
            <tbody>
              <tr>
                <td class="kv-label">${esc(t.poaIssueQuestion)}</td>
                <td>${formatYesNoChecks(poaIssueYes, poaIssueNo, t)}</td>
              </tr>
              <tr><td class="kv-label">${esc(t.poaTypeQuestion)}</td><td><strong>${esc(typeLabel)}</strong></td></tr>
              <tr><td class="kv-label">${esc(t.poaValidityQuestion)}</td><td>${esc(poa.poaValidityDate)}</td></tr>
              <tr>
                <td class="kv-label">${esc(t.poaLegalizedQuestion)}</td>
                <td>${formatYesNoChecks(poaLegalizedYes, poaLegalizedNo, t)}</td>
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


      const declarationName =
        data.declarationName ||
        (Array.isArray(data.signers) && data.signers[0]?.name) ||
        '';
      const declarationSignature =
        data.declarationSignature ||
        (Array.isArray(data.signers) && data.signers[0]?.signature) ||
        declarationName;

      const founderSection = buildPersonStackSection(
        t.sectionFounder,
        personHasData(founder) ? [founder] : [],
        t,
        t.emptyFounder,
        t.roleFounder
      );
      const protectorsSection = buildPersonStackSection(
        t.sectionProtectors,
        protectors,
        t,
        t.emptyProtectors,
        t.roleProtector
      );
      const directorsSection = buildPersonStackSection(
        t.sectionDirectors,
        directors,
        t,
        t.emptyDirectors,
        t.roleDirector,
        `<div class="hint">${esc(t.sectionDirectorsHint)}</div>`
      );

      const content = `
        <main class="doc-body">
          <div style="text-align:center;margin-bottom:8px;">
            <div class="first-page-title"><h1>${esc(t.docTitle)}</h1></div>
          </div>

          <section class="card">
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
            <table class="capital-table">
              <thead><tr><th>${esc(t.capitalMin)}</th><th>${esc(t.capitalAuth)}</th></tr></thead>
              <tbody><tr><td>10,000 USD</td><td>${esc(data.initialPatrimony)} USD</td></tr></tbody>
            </table>
          </section>

          ${founderSection}
          ${protectorsSection}
          ${directorsSection}

          <section class="card">
            <h2>${esc(t.sectionDignitaries)}</h2>
            <table>
              <thead>
                <tr>
                  <th>${esc(t.dignitaryRole)}</th>
                  <th>${esc(t.dignitaryName)}</th>
                  <th>${esc(t.dignitaryBirthDate)}</th>
                  <th>${esc(t.dignitaryAddress)}</th>
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
                  <th>${esc(t.beneficiaryPercentage)}</th>
                  <th>${esc(t.beneficiaryShareholder)}</th>
                  <th>${esc(t.beneficiaryBirthDate)}</th>
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
            @page { size: A4; margin: 0; }
            html, body { margin: 0; padding: 0; }
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 10px; }
            .doc-body { padding: 4px 0 0; margin: 0; box-sizing: border-box; }
            .first-page-title { text-align: center; margin: 0; }
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
            .poa-stack { display: flex; flex-direction: column; gap: 12px; padding: 8px; }
            .person-stack-section .person-block { margin: 8px; border: 1px solid #bae6fd; border-radius: 6px; overflow: hidden; }
            .person-block-title { background: #ecfeff; padding: 6px 8px; font-weight: 800; font-size: 10px; }
            .kv-table { width: 100%; }
            .kv-table .kv-label { width: 38%; font-weight: 700; background: #f8fdff; }
            .empty-msg { font-style: italic; color: #64748b; padding: 8px; }
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

      const headerTemplate = logoDataUri
        ? `<div style="font-size:0;width:100%;padding:4px 12mm;text-align:left;"><img src="${logoDataUri}" style="height:36px;width:auto;" /></div>`
        : '<div style="font-size:1px;">&nbsp;</div>';
      const footerTemplate = '<div style="font-size:1px;">&nbsp;</div>';

      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        scale: 1,
        margin: { top: '20mm', bottom: '12mm', left: '14mm', right: '14mm' },
        ...chromePdfRest,
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

/** Builds inner HTML for tests (no Puppeteer). */
function buildFundacionPdfInnerHtml(data = {}, options = {}) {
  fundacionPdfI18n.assertFundacionPdfI18nParity();
  const founder = getFounderRecord(data);
  const directors = getDirectors(data).map(normalizeFundacionPerson).filter(personHasData);
  const protectors = (Array.isArray(data.protectors) ? data.protectors : [])
    .map(normalizeFundacionPerson)
    .filter(personHasData);
  const beneficiaries = Array.isArray(data.beneficiaries) ? data.beneficiaries : [];
  const dignitaries = Array.isArray(data.dignitaries) ? data.dignitaries : [];
  const lang = fundacionPdfI18n.normalizeLanguage(options.language || data.language);
  const t = fundacionPdfI18n.getFundacionPdfDict(lang);
  const founderSection = buildPersonStackSection(
    t.sectionFounder,
    personHasData(founder) ? [founder] : [],
    t,
    t.emptyFounder,
    t.roleFounder
  );
  const protectorsSection = buildPersonStackSection(
    t.sectionProtectors,
    protectors,
    t,
    t.emptyProtectors,
    t.roleProtector
  );
  const directorsSection = buildPersonStackSection(
    t.sectionDirectors,
    directors,
    t,
    t.emptyDirectors,
    t.roleDirector,
    ''
  );
  return `
    ${founderSection}
    ${protectorsSection}
    ${directorsSection}
    ${buildDignitariesRows(dignitaries, t)}
    ${buildBeneficiariesRows(beneficiaries, t)}
    ${buildPowersHtml(data, t)}
    ${esc(data.foundationObjects)}
    ${esc(data.foundationNameOption1)}
  `;
}

const service = new FundacionHtmlPdfService();
module.exports = service;
module.exports.buildFundacionPdfInnerHtml = buildFundacionPdfInnerHtml;
