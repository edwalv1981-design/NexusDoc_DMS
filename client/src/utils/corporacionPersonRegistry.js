import {
  personDisplayName,
  personNameKey,
  normalizeFundacionPerson,
  mergePersonRecords,
  ensurePersonArray,
} from './fundacionPersonSchema';
import { pickFields } from './fundacionPersonRegistry';

export {
  findMatch,
  getPersonNameSuggestions,
  findPersonInRegistry,
} from './fundacionPersonRegistry';

/** Campos de director en Incorporación (mismo esquema que fundación, sin idCard en UI). */
export const CORP_DIRECTOR_FIELDS = [
  'firstName',
  'secondName',
  'lastName',
  'birthDate',
  'maritalStatus',
  'nationality',
  'passport',
  'phone',
  'email',
  'address',
  'city',
  'country',
];

export const CORP_DIGNITARY_FIELDS = [
  'role',
  'fullName',
  'birthDate',
  'passport',
  'registrationNumber',
];

export const CORP_SHAREHOLDER_PERSON_FIELDS = ['name', 'address'];

export const CORP_SIGNER_FIELDS = ['name', 'signature'];

export function pickCorporacionDirectorFields(source = {}) {
  return pickFields(normalizeFundacionPerson(source), CORP_DIRECTOR_FIELDS);
}

export function pickCorporacionDignitaryFields(source = {}) {
  const row = {
    role: source.role || '',
    fullName: String(source.fullName || '').trim() || personDisplayName(normalizeFundacionPerson(source)),
    birthDate: source.birthDate || '',
    passport: source.passport || '',
    registrationNumber: source.registrationNumber || '',
  };
  return pickFields(row, CORP_DIGNITARY_FIELDS);
}

export function pickCorporacionShareholderPersonFields(source = {}) {
  const name =
    String(source.name || '').trim() ||
    String(source.fullName || '').trim() ||
    personDisplayName(normalizeFundacionPerson(source));
  return pickFields({ name, address: source.address || '' }, CORP_SHAREHOLDER_PERSON_FIELDS);
}

export function pickCorporacionSignerFields(source = {}) {
  const name =
    String(source.name || '').trim() ||
    personDisplayName(normalizeFundacionPerson(source));
  const out = pickFields({ name, signature: source.signature || name }, CORP_SIGNER_FIELDS);
  return out;
}

/**
 * Registro en memoria de personas del formulario de incorporación.
 * exclude: { arrayName, index } omite la fila que se está editando.
 */
export function buildCorporacionPersonRegistry(formData = {}, exclude = null) {
  const map = new Map();

  const addPerson = (raw, extra = {}) => {
    const merged = mergePersonRecords(normalizeFundacionPerson(raw), extra);
    const name = personDisplayName(merged) || merged.fullName || merged.name;
    const key = personNameKey(name);
    if (!key) return;
    const prev = map.get(key) || {};
    map.set(key, mergePersonRecords(prev, merged));
  };

  const skip = (arrayName, index) =>
    exclude && exclude.arrayName === arrayName && exclude.index === index;

  ensurePersonArray(formData.directors).forEach((d, i) => {
    if (!skip('directors', i)) addPerson(d);
  });

  ensurePersonArray(formData.dignitaries).forEach((d, i) => {
    if (!skip('dignitaries', i)) {
      const name = String(d.fullName || '').trim();
      if (!name) return;
      addPerson(
        {
          fullName: name,
          birthDate: d.birthDate,
          passport: d.passport,
          registrationNumber: d.registrationNumber,
        },
        { role: d.role }
      );
    }
  });

  ensurePersonArray(formData.shareholders).forEach((s, i) => {
    if (!skip('shareholders', i)) {
      const name = String(s.name || '').trim();
      if (!name) return;
      addPerson({ fullName: name, name, address: s.address });
    }
  });

  ensurePersonArray(formData.signers).forEach((s, i) => {
    if (!skip('signers', i)) {
      const name = String(s.name || '').trim();
      if (name) addPerson({ fullName: name, name });
    }
  });

  return Array.from(map.entries()).map(([key, data]) => ({
    key,
    name: personDisplayName(data) || data.fullName || data.name,
    data,
  }));
}

/** Migra dignatarios legacy (objeto por rol) a arreglo. */
export function normalizeLoadedCorporacionData(raw = {}, defaults = {}) {
  const clean = { ...raw };

  clean.directors = ensurePersonArray(clean.directors, defaults.directors).map((d) =>
    normalizeFundacionPerson(d)
  );

  if (clean.dignitaries && !Array.isArray(clean.dignitaries)) {
    clean.dignitaries = Object.entries(clean.dignitaries).map(([role, d]) => ({
      role: (d?.role || role || '').toString().toUpperCase(),
      fullName: d?.fullName || '',
      birthDate: d?.birthDate || '',
      passport: d?.passport || '',
      registrationNumber: d?.registrationNumber || '',
    }));
  } else {
    clean.dignitaries = ensurePersonArray(clean.dignitaries, defaults.dignitaries).map((d) => ({
      role: d?.role || '',
      fullName: d?.fullName || '',
      birthDate: d?.birthDate || '',
      passport: d?.passport || '',
      registrationNumber: d?.registrationNumber || '',
    }));
  }

  clean.shareholders = ensurePersonArray(clean.shareholders, defaults.shareholders);
  clean.signers = ensurePersonArray(clean.signers, defaults.signers).map((s) => ({
    name: s?.name || '',
    signature: s?.signature || '',
  }));

  return clean;
}
