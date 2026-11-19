'use strict';

/** Correcciones del administrador sobre una plantilla: solo textos; nunca claves ni posiciones. */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { applySchemaEdits } = require('../services/templateSchemaEdit');

const original = {
  source: 'scanned',
  pages: [{ w: 612, h: 792 }],
  fields: {
    nombre: { key: 'nombre', label: 'Nornbre', kind: 'text', page: 0, rect: [1, 2, 3, 4], required: true },
    pep: { key: 'pep', label: 'SE', kind: 'yesno', page: 0, options: [{ value: 'yes', label: 'Si', rect: [0, 0, 8, 8] }, { value: 'no', label: 'No', rect: [9, 0, 17, 8] }] },
    detalle: { key: 'detalle', label: 'detalles', kind: 'textarea', page: 0, rect: [5, 6, 7, 8], requiredIf: { key: 'pep', value: 'yes' } },
    basura: { key: 'basura', label: 'fi', kind: 'text', page: 0, rect: [9, 9, 9, 9], required: true },
  },
  sections: [{ title: 'Y', items: [{ type: 'guide', text: 'e444' }, { type: 'field', key: 'nombre' }, { type: 'field', key: 'pep' }, { type: 'field', key: 'detalle' }, { type: 'field', key: 'basura' }] }],
};

describe('applySchemaEdits', () => {
  it('corrige textos y conserva claves, posiciones y condiciones', () => {
    const out = applySchemaEdits(original, {
      fields: {
        nombre: { label: 'Nombre completo', hint: 'Como en el pasaporte', rect: [100, 100, 200, 200] },
        pep: { label: '2. ¿Está o ha estado usted en quiebra?', kind: 'text' },
        detalle: { label: 'En caso afirmativo, detalle', kind: 'date' },
      },
      sections: [{ title: 'Datos personales', items: [
        { type: 'guide', text: 'Complete con letra legible.' },
        { type: 'field', key: 'nombre' }, { type: 'field', key: 'pep' }, { type: 'field', key: 'detalle' },
      ] }],
    });
    assert.equal(out.fields.nombre.label, 'Nombre completo');
    assert.equal(out.fields.nombre.hint, 'Como en el pasaporte');
    assert.deepEqual(out.fields.nombre.rect, [1, 2, 3, 4], 'la posición en el PDF no se puede cambiar');
    assert.equal(out.fields.pep.kind, 'yesno', 'un Sí/No no puede pasar a texto');
    assert.equal(out.fields.detalle.kind, 'date', 'texto largo -> fecha sí (mismo grupo)');
    assert.deepEqual(out.fields.detalle.requiredIf, { key: 'pep', value: 'yes' });
    assert.ok(!out.fields.basura, 'campo quitado');
    assert.deepEqual(out.edited.removed, ['basura']);
    assert.equal(out.sections[0].title, 'Datos personales');
    assert.equal(out.sections[0].items[0].text, 'Complete con letra legible.');
    assert.deepEqual(out.fieldOrder, ['nombre', 'pep', 'detalle']);
  });

  it('no acepta claves nuevas ni campos inventados', () => {
    const out = applySchemaEdits(original, {
      fields: { nombre: {}, __proto__x: { label: 'x' }, nuevo: { label: 'Nuevo', kind: 'text' } },
      sections: [{ title: '', items: [{ type: 'field', key: 'nuevo' }, { type: 'field', key: 'nombre' }] }],
    });
    assert.deepEqual(Object.keys(out.fields), ['nombre']);
    assert.deepEqual(out.fieldOrder, ['nombre']);
  });

  it('si se quita la pregunta Sí/No, su detalle deja de ser condicional', () => {
    const out = applySchemaEdits(original, { fields: { detalle: {} }, sections: [{ items: [{ type: 'field', key: 'detalle' }] }] });
    assert.equal(out.fields.detalle.requiredIf, undefined);
  });

  it('campos que el editor dejó fuera de las secciones no se pierden', () => {
    const out = applySchemaEdits(original, { fields: { nombre: {}, pep: {} }, sections: [{ title: 'A', items: [{ type: 'field', key: 'pep' }] }] });
    assert.deepEqual(out.fieldOrder, ['pep', 'nombre']);
  });

  it('limpia caracteres de control y limita el largo', () => {
    const out = applySchemaEdits(original, { fields: { nombre: { label: 'A\u0000B' + 'x'.repeat(500) } }, sections: [] });
    assert.equal(out.fields.nombre.label.startsWith('AB'), true);
    assert.equal(out.fields.nombre.label.length, 300);
  });
});
