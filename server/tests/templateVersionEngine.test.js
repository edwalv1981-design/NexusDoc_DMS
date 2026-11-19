'use strict';

/**
 * Versiones de plantilla: detección de campos (PDF plano y rellenable) y llenado del PDF.
 * Si el entorno no tiene las librerías Python del motor, las pruebas del motor se omiten.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const svc = require('../services/templateVersionService');
const { resolvePythonCommand } = require('../utils/pythonCommand');

const FIX = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', n));
const probe = spawnSync(resolvePythonCommand(), ['-c', 'import pdfplumber, pypdf, reportlab'], { encoding: 'utf8' });
const engineAvailable = probe.status === 0;

describe('templateVersionService (sin motor)', () => {
  it('mapea los 5 formularios del administrador a su tipo canónico', () => {
    assert.equal(svc.formTypeForTemplateId('cumplimiento_individual'), 'Cumplimiento Individual');
    assert.equal(svc.formTypeForTemplateId('cumplimiento_entidades'), 'Cumplimiento Entidades');
    assert.equal(svc.formTypeForTemplateId('fondos'), 'Fondos Registros contables');
    assert.equal(svc.formTypeForTemplateId('corporacion'), 'Corporación');
    assert.equal(svc.formTypeForTemplateId('fundaciones'), 'Fundaciones');
    assert.equal(svc.formTypeForTemplateId('mi_plantilla_dinamica'), null);
  });

  it('los trámites sin marca de versión siguen con el formato estándar', () => {
    assert.equal(svc.versionRefOf({ firstName: 'Ana' }), null);
    assert.equal(svc.versionRefOf(null), null);
    assert.deepEqual(svc.versionRefOf({ __templateVersion: { id: 'x', version: 2 } }), { id: 'x', version: 2 });
  });

  it('las etiquetas KYC conocidas conservan las claves del sistema', () => {
    const kl = svc.knownLabelsFor('Cumplimiento Individual');
    assert.ok(Object.values(kl).includes('firstName'));
    assert.deepEqual(svc.knownLabelsFor('Fundaciones'), {});
  });
});

describe('motor de plantillas (Python)', { skip: !engineAvailable && 'librerías Python del motor no instaladas' }, () => {
  let flatTables;
  let word;
  let acro;
  before(async () => {
    flatTables = await svc.analyzeBuffer(FIX('template_flat_tables.pdf'), 'Cumplimiento Individual');
    word = await svc.analyzeBuffer(FIX('template_flat_word.pdf'), 'Fondos Registros contables');
    acro = await svc.analyzeBuffer(FIX('template_acroform.pdf'), 'Corporación');
  });

  const byLabel = (schema, re) => Object.values(schema.fields).find((f) => re.test(f.label));

  it('PDF plano con tablas: celdas vacías, fechas, Sí/No con detalle y casillas', () => {
    assert.equal(flatTables.source, 'flat');
    assert.ok(flatTables.fieldCount >= 25, `campos: ${flatTables.fieldCount}`);
    assert.equal(byLabel(flatTables, /^Primer nombre$/).key, 'firstName');
    assert.equal(byLabel(flatTables, /^Fecha de nacimiento$/).kind, 'date');
    const roles = byLabel(flatTables, /El Solicitante es uno o más/);
    assert.equal(roles.kind, 'multi');
    assert.equal(roles.options.length, 10);
    const pep = byLabel(flatTables, /Persona Expuesta Pol/);
    assert.equal(pep.kind, 'yesno');
    const detail = Object.values(flatTables.fields).find((f) => f.requiredIf && f.requiredIf.key === pep.key);
    assert.ok(detail, 'detalle condicionado a la respuesta Sí');
    assert.equal(byLabel(flatTables, /^Firma del Solicitante$/).kind, 'signature');
  });

  it('PDF plano estilo Word: guiones bajos, casillas ☐, Sí/No, línea de firma y textos guía', () => {
    assert.equal(byLabel(word, /^Nombre completo$/).kind, 'text');
    assert.equal(byLabel(word, /^Fecha de nacimiento$/).kind, 'date');
    assert.deepEqual(byLabel(word, /origen de los fondos/).options.map((o) => o.label),
      ['Salario', 'Herencia', 'Venta de inmuebles', 'Inversiones']);
    assert.equal(byLabel(word, /expuesta pol/).kind, 'yesno');
    assert.equal(byLabel(word, /Firma del declarante/).kind, 'signature');
    const guides = word.sections.flatMap((s) => s.items.filter((i) => i.type === 'guide').map((i) => i.text));
    assert.ok(guides.some((g) => /letra legible/.test(g)), 'conserva los textos guía');
    assert.deepEqual(word.sections.map((s) => s.title),
      ['1. DATOS DEL DECLARANTE', '2. ORIGEN DE LOS FONDOS', '3. DECLARACIÓN']);
  });

  it('PDF rellenable: usa los campos AcroForm con sus etiquetas', () => {
    assert.equal(acro.source, 'acroform');
    assert.equal(byLabel(acro, /Proposed company name/).acroName, 'company_name');
    assert.equal(byLabel(acro, /Bearer shares/).kind, 'yesno');
    assert.equal(byLabel(acro, /accept the terms/).kind, 'checkbox');
  });

  it('llena el PDF: escribe los valores, marca las casillas y agrega anexo si no hay espacio', async () => {
    const data = {};
    const f = (re) => byLabel(word, re);
    data[f(/^Nombre completo$/).key] = 'María Elena González';
    data[f(/origen de los fondos/).key] = ['salario'];
    data[f(/expuesta pol/).key] = 'yes';
    data[f(/^Dirección$/).key] = 'Calle 50 y Vía España, Edificio Torre Global, piso 12, oficina 1203, Ciudad de Panamá, República de Panamá';
    const out = await svc.fillBuffer(FIX('template_flat_word.pdf'), word, data);
    assert.equal(out.slice(0, 5).toString(), '%PDF-');
    const text = spawnSync('pdftotext', ['-', '-'], { input: out });
    if (text.status === 0) {
      const t = text.stdout.toString();
      assert.match(t, /María Elena González/);
      assert.match(t, /ANEXO \/ ANNEX/);
      assert.match(t, /Torre Global/);
    }
  });

  it('PDF rellenable llenado queda plano (sin campos editables)', async () => {
    const data = { [byLabel(acro, /Proposed company name/).key]: 'Atlas Holdings S.A.' };
    const out = await svc.fillBuffer(FIX('template_acroform.pdf'), acro, data);
    assert.ok(!out.toString('latin1').includes('/AcroForm'), 'sin AcroForm');
  });
});

const ocrProbe = spawnSync(resolvePythonCommand(), ['-c', 'import pytesseract, cv2; pytesseract.get_tesseract_version()'], { encoding: 'utf8' });
describe('plantilla escaneada (OCR)', { skip: (!engineAvailable || ocrProbe.status !== 0) && 'OCR no instalado' }, () => {
  it('lee el texto con OCR y detecta campos, casillas, Sí/No y firma', async () => {
    const sc = await svc.analyzeBuffer(FIX('template_scanned.pdf'), 'Fondos Registros contables');
    assert.equal(sc.source, 'scanned');
    const byLabel = (re) => Object.values(sc.fields).find((f) => re.test(f.label));
    assert.ok(sc.fieldCount >= 10, `campos: ${sc.fieldCount}`);
    assert.equal(byLabel(/^Nombre completo$/).kind, 'text');
    assert.deepEqual(byLabel(/origen de los fondos/).options.map((o) => o.label),
      ['Salario', 'Herencia', 'Venta de inmuebles', 'Inversiones']);
    assert.equal(byLabel(/expuesta pol/).kind, 'yesno');
    assert.equal(byLabel(/Firma del declarante/).kind, 'signature');
    const out = await svc.fillBuffer(FIX('template_scanned.pdf'), sc, { [byLabel(/^Nombre completo$/).key]: 'Ana Gómez' });
    assert.equal(out.slice(0, 5).toString(), '%PDF-');
  });
});
