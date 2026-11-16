'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');
const { buildXlsx, safeSheetNames, colName, crc32 } = require('../utils/xlsxWriter');
const { buildAdminSearchXlsx, flattenFormData } = require('../services/adminSearchXlsxService');

/** Lee las entradas de un ZIP (lo justo para verificar el .xlsx). */
function unzip(buf) {
  const files = {};
  let i = 0;
  while (buf.readUInt32LE(i) === 0x04034b50) {
    const size = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extra = buf.readUInt16LE(i + 28);
    const name = buf.slice(i + 30, i + 30 + nameLen).toString('utf8');
    const data = buf.slice(i + 30 + nameLen + extra, i + 30 + nameLen + extra + size);
    const raw = zlib.inflateRawSync(data);
    assert.equal(crc32(raw), buf.readUInt32LE(i + 14), `CRC de ${name}`);
    files[name] = raw.toString('utf8');
    i += 30 + nameLen + extra + size;
  }
  return files;
}

const sample = {
  results: [
    { formId: 'f1', formType: 'Cumplimiento Individual', userName: 'Ana', userEmail: 'ana@x.com', userCode: 'C1', personName: 'María González', role: 'Solicitante', formDate: '2026-11-15T20:00:00Z',
      formData: { firstName: 'María', applicantRoles: ['director'], signature: 'data:image/png;base64,AAAA', __progress: { step: 1 }, __adminEditLog: [{ x: 1 }] } },
    { formId: 'f2', formType: 'Incorporación', userName: 'Ana', personName: '=HYPERLINK("x") <b>&', formData: { directors: [{ fullName: 'Luis' }, { fullName: 'Eva' }] } },
  ],
  matchingDocuments: [{ filename: 'f.pdf', type: 'SignedDocument', signatureStatus: 'Firma Digital Válida', userName: 'Ana' }],
  searchFilters: { nombres: 'María' },
  exportedBy: 'admin@x.com',
};

describe('xlsxWriter', () => {
  it('genera un .xlsx (ZIP) válido con libro, estilos y hojas', () => {
    const files = unzip(buildXlsx([{ name: 'Hoja', columns: [{ header: 'A' }], rows: [['x'], [5]] }]));
    for (const f of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']) {
      assert.ok(files[f], `falta ${f}`);
    }
    assert.match(files['xl/worksheets/sheet1.xml'], /<c r="A3" s="2"><v>5<\/v><\/c>/);
  });

  it('nombres de hoja válidos y únicos; columnas AA', () => {
    assert.deepEqual(safeSheetNames(['a/b', 'A/B', 'x'.repeat(40)]), ['a b', 'A B (2)', 'x'.repeat(31)]);
    assert.equal(colName(0), 'A');
    assert.equal(colName(26), 'AA');
  });
});

describe('Excel de Consultas', () => {
  const files = unzip(buildAdminSearchXlsx(sample));
  const all = Object.values(files).join('\n');

  it('hojas: Resumen, datos por tipo, Documentos y Búsqueda', () => {
    const wb = files['xl/workbook.xml'];
    for (const n of ['Resumen', 'Datos - Cumplimiento Individual', 'Datos - Incorporación', 'Documentos', 'Búsqueda']) assert.ok(wb.includes(`name="${n}"`), n);
  });

  it('datos completos con etiquetas legibles y sin claves internas ni imágenes', () => {
    assert.ok(all.includes('Primer nombre'));
    assert.ok(all.includes('Director'));
    assert.ok(all.includes('directors 2 · fullName'));
    assert.ok(all.includes('[archivo/imagen adjunta]'));
    assert.doesNotMatch(all, /__progress|__adminEditLog|base64,AAAA/);
  });

  it('el texto nunca se convierte en fórmula y se escapa', () => {
    assert.doesNotMatch(all, /<f>/);
    assert.ok(all.includes('=HYPERLINK(&quot;x&quot;) &lt;b&gt;&amp;'));
  });

  it('fecha en hora de Ecuador y filtros en la hoja Búsqueda', () => {
    assert.ok(all.includes('15/11/2026 15:00'));
    assert.ok(all.includes('admin@x.com'));
  });

  it('aplana listas de personas', () => {
    const flat = flattenFormData({ directors: [{ fullName: 'Luis', passport: 'X' }] });
    assert.deepEqual(flat.map((f) => f.label), ['directors 1 · fullName', 'directors 1 · passport']);
  });
});
