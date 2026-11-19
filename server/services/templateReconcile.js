'use strict';

/**
 * Conciliación de campos entre versiones de una misma plantilla.
 *
 * Al subir la versión N+1 de un formulario, cada campo detectado se compara con los campos de
 * las versiones anteriores:
 *   - MISMO campo (misma etiqueta o muy parecida, mismo tipo)  -> conserva la MISMA clave, así los
 *     datos ya ingresados siguen apareciendo en el formulario nuevo.
 *   - Campo NUEVO                                               -> clave nueva que nunca se usó antes
 *     en ese formulario (no pisa datos de otra pregunta).
 *   - Campo ELIMINADO (estaba en la versión anterior y ya no)   -> se informa; los datos guardados
 *     NO se borran (solo dejan de mostrarse).
 * Las opciones de Sí/No y listas de casillas también conservan sus valores guardados.
 *
 * Funciones puras (sin base de datos) para poder probarlas.
 */

const RESERVED_KEYS = new Set([
  'constructor', 'prototype', 'tostring', 'valueof', 'hasownproperty', 'isprototypeof',
  'id', 'type', 'data', 'language', 'lang',
]);

function norm(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Similitud 0..1 (coeficiente de Dice sobre bigramas). */
function similarity(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const grams = (s) => {
    const out = new Map();
    const t = ` ${s} `;
    for (let i = 0; i < t.length - 1; i += 1) {
      const g = t.slice(i, i + 2);
      out.set(g, (out.get(g) || 0) + 1);
    }
    return out;
  };
  const ga = grams(x);
  const gb = grams(y);
  let inter = 0;
  for (const [g, n] of ga) inter += Math.min(n, gb.get(g) || 0);
  const total = [...ga.values()].reduce((s, n) => s + n, 0) + [...gb.values()].reduce((s, n) => s + n, 0);
  return total ? (2 * inter) / total : 0;
}

/** Tipos compatibles: un texto puede pasar a área de texto o fecha sin perder el dato. */
function kindGroup(kind) {
  if (['text', 'textarea', 'date'].includes(kind)) return 'text';
  if (['multi', 'choice'].includes(kind)) return 'options';
  return kind || 'text';
}

/** Clave segura: solo [a-z0-9_], sin '__' inicial, sin nombres reservados de JavaScript. */
function safeKey(key) {
  let k = String(key || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
  if (!k) k = 'campo';
  if (/^[0-9]/.test(k) || RESERVED_KEYS.has(k.replace(/_/g, ''))) k = `f_${k}`;
  return k;
}

function uniqueKey(base, taken) {
  let k = safeKey(base);
  if (!taken.has(k)) return k;
  let i = 2;
  while (taken.has(`${k}_${i}`)) i += 1;
  return `${k}_${i}`;
}

function relY(field, schema) {
  const page = Number(field.page) || 0;
  const pages = (schema && schema.pages) || [];
  const h = (pages[page] && pages[page].h) || 842;
  const top = field.rect ? field.rect[1] : (field.options && field.options[0] ? field.options[0].rect[1] : 0);
  return page + top / h;
}

/**
 * @param {object} schema           esquema recién analizado (se modifica una copia)
 * @param {Array<object>} previous  esquemas anteriores, del más reciente al más antiguo
 * @returns {{ schema: object, changes: object }}
 */
function reconcileSchema(schema, previous = []) {
  const next = JSON.parse(JSON.stringify(schema || {}));
  const newFields = next.fields || {};
  const prevList = (previous || []).filter((p) => p && p.fields);
  const latest = prevList[0] || null;

  // Registro de todas las claves usadas alguna vez en este formulario (para no reutilizar una clave
  // de otra pregunta).
  const everUsed = new Set();
  for (const p of prevList) Object.keys(p.fields).forEach((k) => everUsed.add(k));

  // Candidatos: primero los de la versión más reciente; luego claves de versiones más antiguas
  // que ya no estaban en la última (un campo que vuelve recupera su clave y sus datos).
  const candidates = [];
  const seenKeys = new Set();
  prevList.forEach((p, idx) => {
    for (const f of Object.values(p.fields)) {
      if (seenKeys.has(f.key)) continue;
      seenKeys.add(f.key);
      candidates.push({ field: f, schema: p, age: idx });
    }
  });

  // Puntaje de cada par (nuevo, anterior)
  const pairs = [];
  for (const nf of Object.values(newFields)) {
    for (const c of candidates) {
      const of = c.field;
      if (kindGroup(nf.kind) !== kindGroup(of.kind)) continue;
      let score = similarity(nf.label, of.label);
      // Mismo lugar en la página ayuda a decidir entre etiquetas parecidas
      const dy = Math.abs(relY(nf, next) - relY(of, c.schema));
      if (dy < 0.03) score += 0.08;
      else if (dy > 0.5) score -= 0.05;
      // Preguntas Sí/No o listas con las mismas opciones
      if (nf.options && of.options) {
        const ol = of.options.map((o) => norm(o.label));
        const common = nf.options.filter((o) => ol.includes(norm(o.label))).length;
        score += 0.1 * (common / Math.max(nf.options.length, of.options.length, 1));
      }
      if (c.age > 0) score -= 0.02 * c.age;
      const threshold = nf.kind === 'yesno' || nf.kind === 'multi' ? 0.8 : 0.84;
      if (score >= threshold) pairs.push({ nf, of, score });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const mapping = new Map(); // clave nueva -> campo anterior
  const usedOld = new Set();
  for (const p of pairs) {
    if (mapping.has(p.nf.key) || usedOld.has(p.of.key)) continue;
    mapping.set(p.nf.key, p.of);
    usedOld.add(p.of.key);
  }

  // Asignar claves finales
  const finalKey = new Map();
  const taken = new Set([...everUsed]);
  // Las claves conservadas se reservan primero
  for (const [nk, of] of mapping) finalKey.set(nk, of.key);
  const keptKeys = new Set(mapping.size ? [...mapping.values()].map((f) => f.key) : []);
  for (const nf of Object.values(newFields)) {
    if (finalKey.has(nf.key)) continue;
    const base = nf.key;
    // Clave nueva: no puede ser una usada antes por otra pregunta ni una conservada ahora
    const k = uniqueKey(base, new Set([...taken, ...keptKeys, ...finalKey.values()]));
    finalKey.set(nf.key, k);
  }

  const changes = { same: [], relabeled: [], added: [], removed: [], kindChanged: [], optionsAdded: [] };
  const outFields = {};
  for (const nf of Object.values(newFields)) {
    const key = finalKey.get(nf.key);
    const f = { ...nf, key };
    const of = mapping.get(nf.key);
    if (of) {
      if (norm(of.label) === norm(nf.label)) changes.same.push(key);
      else changes.relabeled.push({ key, from: of.label, to: nf.label });
      // Texto <-> área de texto no cambia el dato; texto <-> fecha sí (formato distinto).
      if (of.kind !== nf.kind && (of.kind === 'date' || nf.kind === 'date')) {
        changes.kindChanged.push({ key, from: of.kind, to: nf.kind });
      }
      // Opciones: conservar los valores guardados cuando la opción es la misma
      if (Array.isArray(nf.options) && Array.isArray(of.options)) {
        const usedVals = new Set();
        f.options = nf.options.map((o) => {
          if (o.value === 'yes' || o.value === 'no') return o;
          let best = null;
          for (const oo of of.options) {
            if (usedVals.has(oo.value)) continue;
            const s = similarity(o.label, oo.label);
            if (s >= 0.85 && (!best || s > best.s)) best = { s, oo };
          }
          if (best) {
            usedVals.add(best.oo.value);
            return { ...o, value: best.oo.value };
          }
          changes.optionsAdded.push({ key, option: o.label });
          return o;
        });
        // valores únicos
        const seen = new Set();
        f.options = f.options.map((o) => {
          let v = o.value;
          let i = 2;
          while (seen.has(v)) v = `${o.value}_${i++}`;
          seen.add(v);
          return { ...o, value: v };
        });
      }
    } else {
      changes.added.push(key);
    }
    outFields[key] = f;
  }
  // requiredIf apunta a claves finales
  for (const f of Object.values(outFields)) {
    if (f.requiredIf && f.requiredIf.key && finalKey.has(f.requiredIf.key)) {
      const parentNewKey = f.requiredIf.key;
      const parent = outFields[finalKey.get(parentNewKey)];
      let value = f.requiredIf.value;
      // si la opción condicionante cambió de valor por la conciliación
      const orig = newFields[parentNewKey];
      if (orig && orig.options && parent && parent.options) {
        const idx = orig.options.findIndex((o) => o.value === value);
        if (idx >= 0 && parent.options[idx]) value = parent.options[idx].value;
      }
      f.requiredIf = { key: finalKey.get(parentNewKey), value };
    }
  }
  if (latest) {
    for (const of of Object.values(latest.fields)) {
      if (!usedOld.has(of.key)) changes.removed.push({ key: of.key, label: of.label });
    }
  }

  next.fields = outFields;
  next.fieldOrder = (next.fieldOrder || []).map((k) => finalKey.get(k) || k);
  next.sections = (next.sections || []).map((s) => ({
    ...s,
    items: (s.items || []).map((it) => (it.type === 'field' ? { ...it, key: finalKey.get(it.key) || it.key } : it)),
  }));
  next.changes = {
    basedOnVersion: latest ? latest.__version || null : null,
    ...changes,
    summary: {
      same: changes.same.length,
      relabeled: changes.relabeled.length,
      added: changes.added.length,
      removed: changes.removed.length,
      kindChanged: changes.kindChanged.length,
    },
  };
  return { schema: next, changes: next.changes };
}

/** Sin pérdidas: no se quita ningún campo de la versión anterior ni cambia de tipo. */
function isSafeToAutoActivate(changes) {
  if (!changes) return true;
  return (changes.removed || []).length === 0 && (changes.kindChanged || []).length === 0;
}

module.exports = { reconcileSchema, isSafeToAutoActivate, similarity, safeKey, kindGroup };
