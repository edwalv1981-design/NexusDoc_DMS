import {
  buildPersonRegistry,
  personDisplayName,
  personNameKey,
  normalizeFundacionPerson,
  mergeRoleFields,
  FUNDACION_PERSON_FIELDS,
} from './fundacionPersonSchema';

export { buildPersonRegistry };

/** @alias buildPersonRegistry */
export function buildRegistry(formData, exclude = null) {
  return buildPersonRegistry(formData, exclude);
}

/** Nombres completos para datalist (sin duplicados). */
export function getPersonNameSuggestions(registry = []) {
  const seen = new Set();
  return registry
    .map((r) => r.name)
    .filter((name) => {
      const k = personNameKey(name);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/**
 * Busca persona en el registro por texto de nombre (coincidencia exacta normalizada).
 */
export function findMatch(registry = [], nameInput = '') {
  const key = personNameKey(nameInput);
  if (!key) return null;
  const hit = registry.find((r) => r.key === key);
  return hit?.data ?? null;
}

/**
 * Busca por objeto persona (nombre compuesto, first+last, etc.).
 */
export function findPersonInRegistry(registry = [], person = {}) {
  const normalized = normalizeFundacionPerson(person);
  const candidates = [
    personDisplayName(normalized),
    [normalized.firstName, normalized.lastName].filter(Boolean).join(' '),
    normalized.lastName,
    normalized.firstName,
    normalized.fullName,
    normalized.shareholder,
  ]
    .map((s) => personNameKey(s))
    .filter(Boolean);

  for (const key of candidates) {
    const hit = registry.find((r) => r.key === key);
    if (hit?.data) return hit.data;
  }
  return null;
}

/** Copia solo campos listados que tengan valor en source (nunca inventa). */
export function pickFields(source = {}, fieldList = []) {
  const out = {};
  for (const key of fieldList) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      out[key] = value;
    }
  }
  return out;
}

/** Aplica los 13 campos estándar desde un registro coincidente. */
export function snapshotPersonFields(data) {
  return pickFields(normalizeFundacionPerson(data), FUNDACION_PERSON_FIELDS);
}

/** Fusiona campos de rol permitidos desde source sobre target. */
export function applyRoleFields(target = {}, source = {}, allowedFields = []) {
  return mergeRoleFields(target, source, allowedFields);
}
