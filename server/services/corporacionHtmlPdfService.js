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
    '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  const mime = mimeMap[ext];
  if (!mime) return '';
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

/* ── Inline-style constants ──────────────────────────────────────── */
const C = {
  teal: '#0891b2',
  border: '#7dd3fc',
  headerBg: '#ecfeff',
  hintBg: '#f0f9ff',
  hintBorder: '#bae6fd',
  labelColor: '#334155',
  fieldBg: '#f8fdff',
  titleColor: '#0369a1',
  muted: '#64748b',
};

const S = {
  sectionBar: `background:${C.teal};color:#fff;padding:5px 8px;font-size:11px;font-weight:700;`,
  hint: `padding:3px 8px;background:${C.hintBg};border-bottom:1px solid ${C.hintBorder};color:${C.labelColor};font-size:8px;line-height:1.2;`,
  cell: `border:1px solid ${C.border};padding:2px 3px;font-size:8px;`,
  thCell: `background:${C.headerBg};border:1px solid ${C.border};padding:3px 4px;font-size:8px;text-align:center;`,
  fieldLabel: `font-size:8px;font-weight:700;color:${C.labelColor};`,
  fieldVal: `min-height:16px;border:1px solid ${C.hintBorder};padding:3px 4px;background:${C.fieldBg};font-size:9px;word-break:break-word;`,
};

/* ── Director blocks ─────────────────────────────────────────────── */

function directorFieldRow(label, value) {
  return `<tr>
    <td style="width:48%;font-weight:600;color:${C.labelColor};background:${C.fieldBg};padding:2px 4px;font-size:7.5px;border:1px solid ${C.border};">${esc(label)}</td>
    <td style="width:52%;padding:2px 4px;font-size:8px;border:1px solid ${C.border};word-break:break-word;">${esc(value)}</td>
  </tr>`;
}

function buildDirectorTable(d, index) {
  const fields = [
    ['First name / Nombre', d.firstName],
    ['Middle name / Segundo nombre', d.secondName],
    ['Surname(s) / Apellidos', d.lastName],
    ['Date of birth / Fecha de nacimiento', fmtDate(d.birthDate)],
    ['Marital Status / Estado civil', d.maritalStatus],
    ['Citizenship / Nacionalidad', d.nationality],
    ['Passport / Pasaporte', d.passport],
    ['Phone / Telefono', d.phone],
    ['Email', d.email],
    ['Address / Dirección', d.address],
    ['City / ciudad', d.city],
    ['Country / Pais', d.country],
  ];
  const rows = fields.map(([label, val]) => directorFieldRow(label, val || '')).join('');
  return `<table style="width:100%;border-collapse:collapse;">
    <thead><tr>
      <th colspan="2" style="background:${C.headerBg};color:${C.titleColor};font-size:9px;padding:4px 6px;text-align:center;border:1px solid ${C.border};">Director ${index + 1}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildDirectorPairs(directors) {
  let html = '';
  for (let i = 0; i < directors.length; i += 2) {
    const left = buildDirectorTable(directors[i], i);
    const hasRight = i + 1 < directors.length;
    const right = hasRight ? buildDirectorTable(directors[i + 1], i + 1) : '';
    html += `<table style="width:100%;border-collapse:collapse;margin:0;">
      <tr>
        <td style="width:50%;vertical-align:top;padding:0;border:none;">${left}</td>
        ${hasRight ? `<td style="width:50%;vertical-align:top;padding:0;border:none;">${right}</td>` : ''}
      </tr>
    </table>`;
  }
  return html;
}

/* ── Full HTML builder ───────────────────────────────────────────── */

function buildHtml(data, logoDataUri, layoutCss, bodyClass) {
  const directors = Array.isArray(data.directors) ? data.directors : [];
  const shareholders = Array.isArray(data.shareholders) ? data.shareholders : [];
  const dignitaries = Array.isArray(data.dignitaries) ? data.dignitaries : [];
  const signers = Array.isArray(data.signers) ? data.signers : [];

  const capital = Number(String(data.capitalSocial || '10000').replace(/[^\d]/g, '')) || 10000;
  const capitalFmt = new Intl.NumberFormat('en-US').format(capital);

  /* Header: logo top-left, title center-right */
  const logoImg = logoDataUri
    ? `<img src="${logoDataUri}" alt="Logo" style="max-height:40px;width:auto;display:block;" />`
    : `<span style="font-size:12px;font-weight:bold;color:${C.titleColor};">PANAMA TAX LAWYERS</span>`;

  const headerHtml = `<div style="display:flex;align-items:center;margin-bottom:8px;">
    <div style="flex:0 0 auto;">${logoImg}</div>
    <div style="flex:1;text-align:center;">
      <div style="font-size:16px;font-weight:800;color:${C.titleColor};line-height:1.2;">Incorporation Form / Formulario de Incorporaci&oacute;n</div>
    </div>
  </div>`;

  /* Section 1 – Company Name */
  const nameSection = `<div style="border:1px solid ${C.border};margin:6px 0;">
    <div style="${S.sectionBar}">Name of the corporation / Nombre de la compa&ntilde;&iacute;a</div>
    <div style="${S.hint}">List the names you wish to use in order of preference. / Listar los nombres en orden de preferencia.</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:4px 8px;font-weight:700;font-size:8px;color:${C.labelColor};width:120px;border:1px solid ${C.border};background:${C.fieldBg};">1st choice / 1ra Opci&oacute;n</td>
        <td style="padding:4px 8px;font-size:9px;border:1px solid ${C.border};">${esc(data.corpNameSA)}</td>
        <td style="padding:4px 8px;font-size:8px;color:${C.muted};width:40px;border:1px solid ${C.border};text-align:center;background:${C.fieldBg};">S.A.</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;font-weight:700;font-size:8px;color:${C.labelColor};border:1px solid ${C.border};background:${C.fieldBg};">2nd choice / 2da Opci&oacute;n</td>
        <td style="padding:4px 8px;font-size:9px;border:1px solid ${C.border};">${esc(data.corpNameCorp)}</td>
        <td style="padding:4px 8px;font-size:8px;color:${C.muted};border:1px solid ${C.border};text-align:center;background:${C.fieldBg};">Corp.</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;font-weight:700;font-size:8px;color:${C.labelColor};border:1px solid ${C.border};background:${C.fieldBg};">3rd choice / 3ra Opci&oacute;n</td>
        <td style="padding:4px 8px;font-size:9px;border:1px solid ${C.border};">${esc(data.corpNameInc)}</td>
        <td style="padding:4px 8px;font-size:8px;color:${C.muted};border:1px solid ${C.border};text-align:center;background:${C.fieldBg};">Inc.</td>
      </tr>
    </table>
  </div>`;

  /* Section 2 – Authorized Capital */
  const capitalSection = `<div style="border:1px solid ${C.border};margin:6px 0;">
    <div style="${S.sectionBar}">Authorized Capital / Capital Social Autorizado</div>
    <div style="${S.hint}">The minimum authorized capital is US$10,000.00. / El capital m&iacute;nimo autorizado es US$10,000.00.</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="${S.thCell}">Minimum / M&iacute;nimo</th>
        <th style="${S.thCell}">Authorized / Autorizado</th>
      </tr></thead>
      <tbody><tr>
        <td style="text-align:center;font-weight:700;font-size:11px;padding:6px 8px;border:1px solid ${C.border};">10,000 USD</td>
        <td style="text-align:center;font-weight:700;font-size:11px;padding:6px 8px;border:1px solid ${C.border};">${esc(capitalFmt)} USD</td>
      </tr></tbody>
    </table>
  </div>`;

  /* Section 3 – Directors */
  const directorsSection = `<div style="border:1px solid ${C.border};margin:6px 0;">
    <div style="${S.sectionBar}">Directors / Directores</div>
    <div style="${S.hint}">In Panama, a minimum of 3 directors are required. / En Panam&aacute; se requieren m&iacute;nimo 3 directores.</div>
    ${buildDirectorPairs(directors)}
  </div>`;

  /* Section 4 – Officers / Dignitaries */
  const dignitaryRows = dignitaries.map(d => `<tr>
    <td style="${S.cell}font-size:8.5px;padding:3px 4px;">${esc(d.role)}</td>
    <td style="${S.cell}font-size:8.5px;padding:3px 4px;">${esc(d.fullName)}</td>
    <td style="${S.cell}font-size:8.5px;padding:3px 4px;">${esc(fmtDate(d.birthDate))}</td>
    <td style="${S.cell}font-size:8.5px;padding:3px 4px;">${esc(d.passport)}</td>
    <td style="${S.cell}font-size:8.5px;padding:3px 4px;">${esc(d.registrationNumber)}</td>
  </tr>`).join('');

  const officersSection = `<div style="border:1px solid ${C.border};margin:6px 0;">
    <div style="${S.sectionBar}">Officers / Dignatarios</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="${S.thCell}">Position / Cargo</th>
        <th style="${S.thCell}">Full name / Nombre completo</th>
        <th style="${S.thCell}">Date of birth / Fecha de nac.</th>
        <th style="${S.thCell}">Passport / Pasaporte</th>
        <th style="${S.thCell}">Reg. number / No. Registro</th>
      </tr></thead>
      <tbody>${dignitaryRows}</tbody>
    </table>
  </div>`;

  /* Section 5 – Shareholders */
  const shareholderRows = shareholders.map((s, i) => `<tr>
    <td style="${S.cell}text-align:center;">${i + 1}</td>
    <td style="${S.cell}">${esc(s.certificate)}</td>
    <td style="${S.cell}">${esc(s.value)}</td>
    <td style="${S.cell}text-align:center;">${esc(s.shares)}</td>
    <td style="${S.cell}">${esc(s.name)}</td>
    <td style="${S.cell}">${esc(s.address)}</td>
  </tr>`).join('');

  const shareholdersSection = `<div style="border:1px solid ${C.border};margin:6px 0;">
    <div style="${S.sectionBar}">Shareholders / Accionistas</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="${S.thCell}width:5%;">#</th>
        <th style="${S.thCell}">Certificate / Certificado</th>
        <th style="${S.thCell}">Value / Valor</th>
        <th style="${S.thCell}">Shares / Acciones</th>
        <th style="${S.thCell}">Shareholder / Accionista</th>
        <th style="${S.thCell}">Address / Direcci&oacute;n</th>
      </tr></thead>
      <tbody>${shareholderRows}</tbody>
    </table>
  </div>`;

  /* Section 6 – Company Activities */
  const activitiesSection = `<div style="border:1px solid ${C.border};margin:6px 0;">
    <div style="${S.sectionBar}">Company Activities / Actividades de la Compa&ntilde;&iacute;a</div>
    <div style="${S.hint}">Please provide an explanation of the corporation's activities. / Favor provea una explicaci&oacute;n de la actividad de la sociedad.</div>
    <div style="padding:6px 8px;min-height:36px;white-space:pre-wrap;word-break:break-word;font-size:9px;">${esc(data.companyActivities)}</div>
  </div>`;

  /* Section 7 – Declaration */
  const signerBlocks = signers.map(s => `<div style="border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px;">
    <div style="${S.fieldLabel}">Signature / Firma:</div>
    <div style="${S.fieldVal}margin-bottom:4px;">${esc(s.signature)}</div>
    <div style="${S.fieldLabel}">Name / Nombre:</div>
    <div style="${S.fieldVal}">${esc(s.name)}</div>
  </div>`).join('');

  const declarationSection = `<div style="border:1px solid ${C.border};margin:6px 0;">
    <div style="${S.sectionBar}">Declaration / Declaraci&oacute;n</div>
    <div style="${S.hint}">I/We declare that the origin of funds and goods linked to the services provided by Panama Tax Lawyers and its associates derive from legitimate sources. / Declaro que el origen de los fondos vinculados a los servicios de Panama Tax Lawyers derivan de fuentes leg&iacute;timas.</div>
    <div style="padding:8px;">
      ${signerBlocks}
      <div style="margin-top:8px;">
        <div style="${S.fieldLabel}">Date / Fecha:</div>
        <div style="${S.fieldVal}">${esc(fmtDate(data.declarationDate))}</div>
      </div>
    </div>
  </div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body {
      margin: 0; padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      font-size: 9.5px;
    }
    ${layoutCss}
  </style>
</head>
<body class="${bodyClass}">
  ${headerHtml}
  ${nameSection}
  ${capitalSection}
  ${directorsSection}
  ${officersSection}
  ${shareholdersSection}
  ${activitiesSection}
  ${declarationSection}
</body>
</html>`;
}

/* ── Service class ───────────────────────────────────────────────── */

class CorporacionHtmlPdfService {
  async generatePdf(data = {}, options = {}) {
    corporacionLayoutGuard.assertCorporacionPdfLayoutInvariants();
    corporacionPdfI18n.assertCorporacionPdfI18nParity();
    let browser = null;
    try {
      const rootDir = process.cwd().includes('server')
        ? path.join(process.cwd(), '..')
        : process.cwd();

      let logoDataUri = '';
      const logoPath = path.join(rootDir, 'templates', 'logo_empresa.png');
      if (fs.existsSync(logoPath)) {
        logoDataUri = toDataUri(logoPath);
      }

      const plan = corporacionLayoutGuard.analyzeFormData(data);
      const layoutCss = corporacionLayoutGuard.getAdaptiveCss(plan);
      const bodyClass = corporacionLayoutGuard.bodyClassForPlan(plan);

      const html = buildHtml(data, logoDataUri, layoutCss, bodyClass);

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });

      const pdfOpts = corporacionLayoutGuard.getCorporacionPuppeteerPdfChromeOptions();

      const headerTemplate = logoDataUri
        ? `<div style="font-size:0;width:100%;padding:4px 12mm;"><img src="${logoDataUri}" style="height:36px;width:auto;" /></div>`
        : '<div style="font-size:1px;">&nbsp;</div>';
      const footerTemplate = '<div style="font-size:1px;">&nbsp;</div>';

      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        scale: 1,
        ...pdfOpts,
        margin: { ...pdfOpts.margin, top: '15mm' },
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

module.exports = new CorporacionHtmlPdfService();
