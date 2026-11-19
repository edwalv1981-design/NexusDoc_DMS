'use strict';

/**
 * Edición manual (por el administrador) del esquema detectado de una versión de plantilla.
 *
 * Seguridad / integridad de datos:
 *  - Solo se pueden editar textos: etiquetas, textos de ayuda, títulos de sección, opciones (texto),
 *    obligatoriedad y tipo dentro del mismo grupo (texto/área/fecha). No se pueden crear claves
 *    nuevas ni cambiar posiciones en el PDF: la geometría y las claves salen siempre del original.
 *  - Quitar un campo solo lo oculta en esta versión; los datos guardados en trámites no se tocan.
 *  - Todo texto se limita en largo y se le quitan caracteres de control (se muestra escapado en React).
 */

const KIND_GROUPS = { text: 'text', textarea: 'text', date: 'text' };

function cleanText(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, max);
}

function applySchemaEdits(original, edited) {
  const orig = original || {};
  const ed = edited && typeof edited === 'object' ? edited : {};
  const origFields = orig.fields || {};
  const edFields = ed.fields && typeof ed.fields === 'object' ? ed.fields : {};
  const fields = {};

  for (const [key, of] of Object.entries(origFields)) {
    if (!Object.prototype.hasOwnProperty.call(edFields, key)) continue; // quitado por el administrador
    const ef = edFields[key] || {};
    const f = { ...of };
    const label = cleanText(ef.label, 300);
    if (label) f.label = label;
    if (typeof ef.required === 'boolean' && f.kind !== 'signature') f.required = ef.required;
    if (ef.kind && KIND_GROUPS[of.kind] && KIND_GROUPS[ef.kind] === KIND_GROUPS[of.kind]) f.kind = ef.kind;
    if (ef.hint !== undefined) {
      const h = cleanText(ef.hint, 1500);
      if (h) f.hint = h; else delete f.hint;
    }
    if (Array.isArray(of.options) && Array.isArray(ef.options)) {
      f.options = of.options.map((o) => {
        const eo = ef.options.find((x) => x && x.value === o.value);
        const l = eo ? cleanText(eo.label, 200) : '';
        return l ? { ...o, label: l } : o;
      });
    }
    fields[key] = f;
  }
  // Condiciones que apuntan a un campo quitado se eliminan
  for (const f of Object.values(fields)) {
    if (f.requiredIf && !fields[f.requiredIf.key]) delete f.requiredIf;
  }

  const sections = [];
  const seen = new Set();
  for (const s of Array.isArray(ed.sections) ? ed.sections.slice(0, 200) : []) {
    const items = [];
    for (const it of Array.isArray(s && s.items) ? s.items.slice(0, 500) : []) {
      if (it && it.type === 'field' && fields[it.key] && !seen.has(it.key)) {
        seen.add(it.key);
        items.push({ type: 'field', key: it.key });
      } else if (it && it.type === 'guide') {
        const text = cleanText(it.text, 3000);
        if (text) items.push({ type: 'guide', text, ...(it.heading ? { heading: true } : {}) });
      }
    }
    const title = cleanText(s && s.title, 200);
    if (items.length || title) sections.push({ id: `s${sections.length + 1}`, title, items });
  }
  // Campos que quedaron fuera de las secciones: al final (no se pierden)
  const orphan = Object.keys(fields).filter((k) => !seen.has(k));
  if (orphan.length) {
    if (!sections.length) sections.push({ id: 's1', title: '', items: [] });
    sections[sections.length - 1].items.push(...orphan.map((k) => ({ type: 'field', key: k })));
  }

  const fieldOrder = sections.flatMap((s) => s.items.filter((i) => i.type === 'field').map((i) => i.key));
  return {
    ...orig,
    fields,
    sections,
    fieldOrder,
    fieldCount: Object.keys(fields).length,
    edited: { at: new Date().toISOString(), removed: Object.keys(origFields).filter((k) => !fields[k]) },
  };
}

module.exports = { applySchemaEdits, cleanText };
