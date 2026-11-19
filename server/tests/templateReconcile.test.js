'use strict';

/**
 * Versiones de una misma plantilla: los campos que ya existían conservan su clave (y por lo tanto
 * los datos ingresados), los nuevos reciben una clave nueva sin choques y los eliminados se informan.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { reconcileSchema, isSafeToAutoActivate, safeKey } = require('../services/templateReconcile');
const svc = require('../services/templateVersionService');
const { resolvePythonCommand } = require('../utils/pythonCommand');

const field = (key, label, kind = 'text', extra = {}) => ({ key, label, kind, page: 0, rect: [0, 100, 10, 110], ...extra });
const schemaOf = (...fields) => ({
  pages: [{ w: 612, h: 792 }],
  fields: Object.fromEntries(fields.map((f) => [f.key, f])),
  fieldOrder: fields.map((f) => f.key),
  sections: [{ title: '', items: fields.map((f) => ({ type: 'field', key: f.key })) }],
});

describe('reconcileSchema (sin motor)', () => {
  it('primera versión: todo es nuevo y se puede activar', () => {
    const { schema, changes } = reconcileSchema(schemaOf(field('nombre', 'Nombre')), []);
    assert.deepEqual(changes.added, ['nombre']);
    assert.ok(schema.fields.nombre);
    assert.equal(isSafeToAutoActivate(changes), true);
  });

  it('mismo campo con la etiqueta un poco distinta conserva la clave anterior', () => {
    const v1 = schemaOf(field('numero_de_pasaporte', 'Número de pasaporte'));
    const v2 = schemaOf(field('numero_de_pasaporte_o_cedula', 'Número de pasaporte o cédula'));
    const { schema, changes } = reconcileSchema(v2, [v1]);
    assert.ok(schema.fields.numero_de_pasaporte, 'clave anterior conservada');
    assert.equal(changes.relabeled.length, 1);
    assert.deepEqual(changes.added, []);
  });

  it('un campo nuevo nunca reutiliza la clave de otra pregunta de versiones anteriores', () => {
    const v1 = schemaOf(field('telefono', 'Teléfono'));
    const v2 = schemaOf(field('telefono', 'Fecha de constitución de la empresa', 'date'));
    const { schema, changes } = reconcileSchema(v2, [v1]);
    assert.ok(!schema.fields.telefono, 'no pisa la clave de Teléfono');
    assert.equal(changes.added.length, 1);
    assert.equal(changes.removed[0].key, 'telefono');
    assert.equal(isSafeToAutoActivate(changes), false, 'se quitó un campo: queda pendiente');
  });

  it('un campo que vuelve en una versión posterior recupera su clave', () => {
    const v1 = schemaOf(field('correo', 'Correo electrónico'), field('nombre', 'Nombre'));
    const v2 = schemaOf(field('nombre', 'Nombre'));
    const v3 = schemaOf(field('nombre', 'Nombre'), field('correo_electronico', 'Correo electrónico'));
    const { schema } = reconcileSchema(v3, [{ ...v2 }, { ...v1 }]);
    assert.ok(schema.fields.correo);
  });

  it('las opciones de una lista conservan sus valores guardados y se informa la opción nueva', () => {
    const opts = (labels) => labels.map((l, i) => ({ value: l.toLowerCase().replace(/\W+/g, '_'), label: l, rect: [0, 100 + i * 10, 8, 108 + i * 10] }));
    const v1 = schemaOf(field('origen', 'Origen de los fondos', 'multi', { options: opts(['Salario', 'Herencia']) }));
    const v2 = schemaOf(field('origen_x', 'Origen de los fondos', 'multi',
      { options: [{ value: 'sueldo', label: 'Salario ', rect: [0, 100, 8, 108] }, ...opts(['Herencia', 'Donación']).map((o) => o)] }));
    const { schema, changes } = reconcileSchema(v2, [v1]);
    assert.deepEqual(schema.fields.origen.options.map((o) => o.value), ['salario', 'herencia', 'donaci_n']);
    assert.deepEqual(changes.optionsAdded.map((o) => o.option), ['Donación']);
  });

  it('los detalles condicionados siguen apuntando a su pregunta Sí/No', () => {
    const yn = { options: [{ value: 'yes', label: 'Sí', rect: [0, 0, 8, 8] }, { value: 'no', label: 'No', rect: [10, 0, 18, 8] }] };
    const v1 = schemaOf(field('pep', '¿Es usted PEP?', 'yesno', yn));
    const v2 = schemaOf(field('es_usted_pep', '¿Es usted PEP?', 'yesno', yn),
      field('detalle', 'En caso afirmativo, explique', 'textarea', { requiredIf: { key: 'es_usted_pep', value: 'yes' } }));
    const { schema } = reconcileSchema(v2, [v1]);
    assert.deepEqual(schema.fields.detalle.requiredIf, { key: 'pep', value: 'yes' });
  });

  it('claves seguras: sin nombres reservados ni prefijos del sistema', () => {
    assert.equal(safeKey('__metadata'), 'metadata');
    assert.equal(safeKey('constructor'), 'f_constructor');
    assert.equal(safeKey('1er_nombre'), 'f_1er_nombre');
  });
});

const probe = spawnSync(resolvePythonCommand(), ['-c', 'import pdfplumber, pypdf, reportlab'], { encoding: 'utf8' });
describe('v1 -> v2 con PDF reales', { skip: probe.status !== 0 && 'motor Python no instalado' }, () => {
  it('conserva claves, detecta nuevos y eliminados, y los datos ya ingresados siguen visibles', async () => {
    const FIX = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', n));
    const v1 = await svc.analyzeBuffer(FIX('template_flat_word.pdf'), 'Fondos Registros contables');
    const raw2 = await svc.analyzeBuffer(FIX('template_flat_word_v2.pdf'), 'Fondos Registros contables');
    const { schema: v2, changes } = reconcileSchema(raw2, [v1]);
    const keyOf = (s, re) => Object.values(s.fields).find((f) => re.test(f.label)).key;

    assert.equal(keyOf(v2, /^Nombre completo$/), keyOf(v1, /^Nombre completo$/));
    assert.equal(keyOf(v2, /pasaporte/), keyOf(v1, /pasaporte/), 'pasaporte renombrado conserva la clave');
    assert.equal(keyOf(v2, /expuesta pol/), keyOf(v1, /expuesta pol/));
    assert.ok(changes.added.includes(keyOf(v2, /Profesi/)), 'profesión es nueva');
    assert.deepEqual(changes.removed.map((r) => r.label), ['Correo electrónico']);
    assert.deepEqual(changes.optionsAdded.map((o) => o.option), ['Donación']);
    assert.equal(isSafeToAutoActivate(changes), false);

    // Un trámite llenado con v1 se abre con v2: sus datos siguen en los mismos campos
    const data = { [keyOf(v1, /^Nombre completo$/)]: 'Ana', [keyOf(v1, /pasaporte/)]: 'P-1' };
    const out = await svc.fillBuffer(FIX('template_flat_word_v2.pdf'), v2, data);
    const txt = spawnSync('pdftotext', ['-', '-'], { input: out });
    if (txt.status === 0) {
      assert.match(txt.stdout.toString(), /Ana/);
      assert.match(txt.stdout.toString(), /P-1/);
    }
  });
});
