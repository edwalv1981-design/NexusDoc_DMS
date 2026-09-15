'use strict';

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
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(v);
  }
}

function toDataUri(filePath) {
  try {
    if (!fs.existsSync(filePath)) return '';
    const ext = String(path.extname(filePath) || '').toLowerCase();
    const mimeMap = {
      '.png': 'image/png', '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    const mime = mimeMap[ext];
    if (!mime) return '';
    const b64 = fs.readFileSync(filePath).toString('base64');
    return `data:${mime};base64,${b64}`;
  } catch {
    return '';
  }
}

class AdminSearchPdfService {
  async generateSearchPdf({ searchFilters = {}, results = [], matchingDocuments = [], catalogPeople = [] } = {}) {
    let browser;
    try {
      const logoPath = path.join(__dirname, '../templates/assets/logo.png');
      const logoDataUri = toDataUri(logoPath);
      const generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'medium' });

      // Group forms and documents by User for clear summary reading
      const userGroupMap = {};

      const ensureUserGroup = (userId, name, email, code) => {
        const key = userId || email || name || 'General';
        if (!userGroupMap[key]) {
          userGroupMap[key] = {
            userName: name || 'Usuario No Especificado',
            userEmail: email || '—',
            userCode: code || 'Sin Código',
            forms: [],
            documents: []
          };
        }
        return userGroupMap[key];
      };

      results.forEach(f => {
        const grp = ensureUserGroup(f.userId, f.userName, f.userEmail, f.userCode);
        grp.forms.push(f);
      });

      matchingDocuments.forEach(d => {
        const grp = ensureUserGroup(d.userId, d.userName, d.userEmail, d.userCode);
        grp.documents.push(d);
      });

      const userGroups = Object.values(userGroupMap);

      // Render Filters Summary
      const activeFilters = [];
      if (searchFilters.nombres) activeFilters.push(`Nombres/Apellidos: "${searchFilters.nombres}"`);
      if (searchFilters.ruc) activeFilters.push(`RUC/ID: "${searchFilters.ruc}"`);
      if (searchFilters.codigoUnico) activeFilters.push(`Código Único: "${searchFilters.codigoUnico}"`);
      if (searchFilters.usuario) activeFilters.push(`Usuario: "${searchFilters.usuario}"`);
      if (searchFilters.empresa) activeFilters.push(`Empresa: "${searchFilters.empresa}"`);
      if (searchFilters.formType) activeFilters.push(`Tipo Formulario: "${searchFilters.formType}"`);

      const filterStr = activeFilters.length > 0 ? activeFilters.join(' | ') : 'Todos los registros (Sin filtro)';

      // HTML template construction
      let userSectionsHtml = '';

      if (userGroups.length === 0) {
        userSectionsHtml = `
          <div style="text-align: center; padding: 40px; color: #64748b; font-style: italic;">
            No se encontraron formularios ni documentos adjuntos para los criterios ingresados.
          </div>
        `;
      } else {
        userSectionsHtml = userGroups.map((grp, gIdx) => {
          // Render forms table for this user
          const formsHtml = grp.forms.length > 0 ? `
            <div style="margin-top: 10px; margin-bottom: 14px;">
              <div style="font-size: 11px; font-weight: 800; color: #0f766e; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                📋 FORMULARIOS CREADOS / REGISTRADOS (${grp.forms.length}):
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #cbd5e1;">
                <thead>
                  <tr style="background: #0f766e; color: #ffffff; text-align: left;">
                    <th style="padding: 6px 8px; width: 25%;">TIPO FORMULARIO</th>
                    <th style="padding: 6px 8px; width: 35%;">ENTIDAD / RAZÓN SOCIAL / NOMBRE</th>
                    <th style="padding: 6px 8px; width: 25%;">PARTICIPANTES / PARTICIPACIÓN</th>
                    <th style="padding: 6px 8px; width: 15%;">FECHA</th>
                  </tr>
                </thead>
                <tbody>
                  ${grp.forms.map((f, fIdx) => {
                    const participantsStr = (f.participants || []).slice(0, 3).map(p => `${p.role}: ${p.name}`).join('; ');
                    return `
                      <tr style="border-bottom: 1px solid #e2e8f0; background: ${fIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                        <td style="padding: 6px 8px; font-weight: 700; color: #0369a1;">${esc(f.formType)}</td>
                        <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">${esc(f.entityName || 'Formulario')}</td>
                        <td style="padding: 6px 8px; color: #334155;">${esc(participantsStr || f.role || 'Titular')}</td>
                        <td style="padding: 6px 8px; color: #64748b;">${esc(fmtDate(f.formDate))}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="font-size: 10px; color: #94a3b8; font-style: italic; margin-bottom: 10px;">
              No posee formularios registrados.
            </div>
          `;

          // Render documents table for this user
          const docsHtml = grp.documents.length > 0 ? `
            <div style="margin-top: 10px; margin-bottom: 14px;">
              <div style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                📎 DOCUMENTOS ADJUNTOS Y FIRMADOS (${grp.documents.length}):
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #cbd5e1;">
                <thead>
                  <tr style="background: #0284c7; color: #ffffff; text-align: left;">
                    <th style="padding: 6px 8px; width: 50%;">NOMBRE DEL ARCHIVO / TÍTULO</th>
                    <th style="padding: 6px 8px; width: 30%;">TIPO DE ADJUNTO / ESTADO</th>
                    <th style="padding: 6px 8px; width: 20%;">FECHA REGISTRO</th>
                  </tr>
                </thead>
                <tbody>
                  ${grp.documents.map((d, dIdx) => `
                    <tr style="border-bottom: 1px solid #e2e8f0; background: ${dIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                      <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">📄 ${esc(d.filename)}</td>
                      <td style="padding: 6px 8px; color: #0369a1; font-weight: 600;">${esc(d.signatureStatus || d.type)}</td>
                      <td style="padding: 6px 8px; color: #64748b;">${esc(fmtDate(d.createdAt))}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="font-size: 10px; color: #94a3b8; font-style: italic; margin-bottom: 10px;">
              No posee documentos adjuntos registrados.
            </div>
          `;

          return `
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; margin-bottom: 16px; page-break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 10px;">
                <div>
                  <span style="font-size: 14px; font-weight: 800; color: #0f172a;">👤 ${esc(grp.userName)}</span>
                  <span style="font-size: 11px; color: #64748b; margin-left: 10px;">(${esc(grp.userEmail)})</span>
                </div>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; font-size: 10px; font-weight: 800; padding: 2px 8px; borderRadius: 4px;">
                  CÓDIGO: ${esc(grp.userCode)}
                </div>
              </div>
              ${formsHtml}
              ${docsHtml}
            </div>
          `;
        }).join('');
      }

      const fullHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Reporte Administrativo de Busqueda - NexusDoc DMS</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 20px;
      font-size: 11px;
      line-height: 1.4;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
    }
    .title {
      font-size: 18px;
      font-weight: 800;
      color: #0f766e;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    .filter-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 18px;
      font-size: 10px;
    }
    .footer-text {
      margin-top: 25px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <table class="header-table">
    <tr>
      <td style="width: 70%; vertical-align: middle;">
        <h1 class="title">NEXUSDOC DMS</h1>
        <div class="subtitle">REPORTE ADMINISTRATIVO DE BÚSQUEDA Y TRAZABILIDAD</div>
      </td>
      <td style="width: 30%; text-align: right; vertical-align: middle;">
        ${logoDataUri ? `<img src="${logoDataUri}" style="height: 38px; width: auto;" />` : ''}
        <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Emisión: ${esc(generatedAt)}</div>
      </td>
    </tr>
  </table>

  <div class="filter-box">
    <strong>CRITERIO DE BÚSQUEDA APLICADO:</strong> ${esc(filterStr)}<br/>
    <strong>TOTAL USUARIOS ENCONTRADOS:</strong> ${userGroups.length} | 
    <strong>TOTAL FORMULARIOS:</strong> ${results.length} | 
    <strong>TOTAL ADJUNTOS:</strong> ${matchingDocuments.length}
  </div>

  ${userSectionsHtml}

  <div class="footer-text">
    Este reporte ha sido generado automáticamente por el módulo de Administración Master de NexusDoc DMS.<br/>
    Contiene el inventario oficial de títulos de formularios y documentos adjuntos del sistema.
  </div>

</body>
</html>`;

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      await page.setContent(fullHtml, { waitUntil: 'domcontentloaded', timeout: 60000 });

      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
      });

      return Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);

    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = new AdminSearchPdfService();
