/** Campos estándar de persona (fundador, protector, director, apoderado). */
export const FUNDACION_PERSON_FIELDS = [
  'firstName',
  'secondName',
  'lastName',
  'birthDate',
  'maritalStatus',
  'nationality',
  'passport',
  'idCard',
  'phone',
  'email',
  'address',
  'city',
  'country',
];

/** Campos reducidos — paso Dignatarios. */
export const FUNDACION_DIGNITARY_FIELDS = [
  'role',
  'fullName',
  'birthDate',
  'address',
  'registrationNumber',
];

/** Campos reducidos — paso Beneficiarios. */
export const FUNDACION_BENEFICIARY_FIELDS = ['percentage', 'shareholder', 'birthDate', 'address'];

export function emptyFundacionPerson() {
  return Object.fromEntries(FUNDACION_PERSON_FIELDS.map((k) => [k, '']));
}

export function emptyFundacionDignitary(role = '') {
  return { role, fullName: '', birthDate: '', address: '', registrationNumber: '' };
}

export function emptyFundacionBeneficiary() {
  return { percentage: '', shareholder: '', birthDate: '', address: '' };
}

/** Coerce legacy saves: null, single object, or non-array → array. */
export function ensurePersonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return Array.isArray(fallback) ? [...fallback] : fallback;
}

/** Migra registros legacy (fullName) al esquema de nombre dividido. */
export function normalizeFundacionPerson(raw = {}) {
  const person = { ...emptyFundacionPerson(), ...raw };
  if (!person.firstName && !person.lastName && raw.fullName) {
    const parts = String(raw.fullName).trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 3) {
      person.firstName = parts[0];
      person.secondName = parts.slice(1, -1).join(' ');
      person.lastName = parts[parts.length - 1];
    } else if (parts.length === 2) {
      person.firstName = parts[0];
      person.lastName = parts[1];
    } else if (parts.length === 1) {
      person.firstName = parts[0];
    }
  }
  if (raw.birthPlace && !person.city) person.city = raw.birthPlace;
  return person;
}

export function normalizeFundacionDignitary(raw = {}) {
  const role = raw.role || raw.position || '';
  const d = { ...emptyFundacionDignitary(role), ...raw, role };
  if (!String(d.fullName || '').trim()) {
    d.fullName =
      String(raw.fullName || '').trim() || personDisplayName(normalizeFundacionPerson(raw));
  }
  return pickRoleFields(d, FUNDACION_DIGNITARY_FIELDS);
}

export function normalizeFundacionBeneficiary(raw = {}) {
  const b = { ...emptyFundacionBeneficiary(), ...raw };
  if (!String(b.shareholder || '').trim()) {
    b.shareholder =
      String(raw.shareholder || raw.fullName || '').trim() ||
      personDisplayName(normalizeFundacionPerson(raw));
  }
  return pickRoleFields(b, FUNDACION_BENEFICIARY_FIELDS);
}

function pickRoleFields(obj, allowed) {
  return Object.fromEntries(allowed.map((k) => [k, obj[k] ?? '']));
}

/** Maps canonical person fields to flat POA keys on FundacionForm state. */
export const POA_FORM_FIELD_MAP = {
  firstName: 'poaFirstName',
  secondName: 'poaMiddleName',
  lastName: 'poaLastName',
  birthDate: 'poaBirthDate',
  maritalStatus: 'poaMaritalStatus',
  nationality: 'poaNationality',
  passport: 'poaPassport',
  idCard: 'poaIdCard',
  phone: 'poaPhone',
  email: 'poaEmail',
  address: 'poaAddress',
  city: 'poaCity',
  country: 'poaCountry',
};

export function poaPersonFromFormData(formData = {}) {
  return normalizeFundacionPerson({
    firstName: formData.poaFirstName,
    secondName: formData.poaMiddleName,
    lastName: formData.poaLastName,
    birthDate: formData.poaBirthDate,
    maritalStatus: formData.poaMaritalStatus,
    nationality: formData.poaNationality,
    passport: formData.poaPassport,
    idCard: formData.poaIdCard,
    phone: formData.poaPhone,
    email: formData.poaEmail,
    address: formData.poaAddress,
    city: formData.poaCity,
    country: formData.poaCountry,
  });
}

export function personDisplayName(person) {
  const first = String(person.firstName || '').trim();
  const second = String(person.secondName || '').trim();
  const last = String(person.lastName || '').trim();

  if (first || second || last) {
    let name = [first, second].filter(Boolean).join(' ').trim();
    if (last) {
      const nameLower = name.toLowerCase();
      const lastLower = last.toLowerCase();
      if (!nameLower || (!nameLower.endsWith(lastLower) && !nameLower.includes(` ${lastLower}`))) {
        name = name ? `${name} ${last}` : last;
      }
    }
    if (name) return name;
  }

  return String(person.fullName || person.shareholder || '').trim();
}

export function dignitaryDisplayName(d) {
  return String(d?.fullName || '').trim() || personDisplayName(normalizeFundacionPerson(d || {}));
}

export function beneficiaryDisplayName(b) {
  return (
    String(b?.shareholder || b?.fullName || '').trim() ||
    personDisplayName(normalizeFundacionPerson(b || {}))
  );
}

/** Normaliza para coincidencia: minúsculas, espacios, sin acentos. */
export function personNameKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function personHasData(person) {
  return Boolean(personDisplayName(person));
}

export function snapshotFromPerson(person) {
  return normalizeFundacionPerson(person);
}

/** Fusiona campos no vacíos de source sobre target (coincidencia parcial OK). */
export function mergePersonRecords(target = {}, source = {}) {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Copia solo campos permitidos del rol; mapea nombre desde registros divididos o fullName.
 */
export function mergeRoleFields(target = {}, source = {}, allowedFields = []) {
  const out = { ...target };
  const normalized = normalizeFundacionPerson(source);
  const nameFromParts = personDisplayName(normalized);

  for (const key of allowedFields) {
    let value = source[key];
    if (key === 'fullName' && !String(value || '').trim()) {
      value = source.fullName || nameFromParts;
    }
    if (key === 'shareholder' && !String(value || '').trim()) {
      value = source.shareholder || source.fullName || nameFromParts;
    }
    if (key === 'registrationNumber' && !String(value || '').trim()) {
      value = source.registrationNumber;
    }
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Registro en memoria de personas del formulario, indexado por nombre normalizado.
 * exclude: { arrayName, index } omite la fila que se está editando.
 */
export function buildPersonRegistry(formData, exclude = null) {
  const map = new Map();

  const addPerson = (raw, extra = {}) => {
    const merged = mergePersonRecords(normalizeFundacionPerson(raw), extra);
    const name = personDisplayName(merged) || merged.fullName || merged.shareholder;
    const key = personNameKey(name);
    if (!key) return;
    const prev = map.get(key) || {};
    map.set(key, mergePersonRecords(prev, snapshotFromPerson(merged)));
  };

  const skip = (arrayName, index) =>
    exclude && exclude.arrayName === arrayName && exclude.index === index;

  ensurePersonArray(formData.founders).forEach((p, i) => {
    if (!skip('founders', i)) addPerson(p);
  });
  ensurePersonArray(formData.protectors).forEach((p, i) => {
    if (!skip('protectors', i)) addPerson(p);
  });
  ensurePersonArray(formData.councilMembers).forEach((p, i) => {
    if (!skip('councilMembers', i)) addPerson(p);
  });
  ensurePersonArray(formData.dignitaries).forEach((d, i) => {
    if (!skip('dignitaries', i)) {
      const name = dignitaryDisplayName(d);
      if (!name) return;
      addPerson(
        {
          fullName: name,
          birthDate: d.birthDate,
          address: d.address,
          registrationNumber: d.registrationNumber,
        },
        { role: d.role }
      );
    }
  });
  ensurePersonArray(formData.beneficiaries).forEach((b, i) => {
    if (!skip('beneficiaries', i)) {
      const name = beneficiaryDisplayName(b);
      if (!name) return;
      addPerson(
        { shareholder: name, fullName: name, birthDate: b.birthDate, address: b.address },
        { percentage: b.percentage }
      );
    }
  });

  const poaName = [formData.poaFirstName, formData.poaMiddleName, formData.poaLastName]
    .filter(Boolean)
    .join(' ');
  if (poaName && !(exclude && exclude.arrayName === 'poa')) {
    addPerson({
      firstName: formData.poaFirstName,
      secondName: formData.poaMiddleName,
      lastName: formData.poaLastName,
      birthDate: formData.poaBirthDate,
      maritalStatus: formData.poaMaritalStatus,
      nationality: formData.poaNationality,
      passport: formData.poaPassport,
      idCard: formData.poaIdCard,
      phone: formData.poaPhone,
      email: formData.poaEmail,
      address: formData.poaAddress,
      city: formData.poaCity,
      country: formData.poaCountry,
    });
  }

  return Array.from(map.entries()).map(([key, data]) => ({
    key,
    name: personDisplayName(data),
    data,
  }));
}

/**
 * Normalizes API / legacy JSON before merging into FundacionForm state.
 * Prevents runtime crashes when saved arrays are missing or malformed.
 */
export function normalizeLoadedFundacionData(raw = {}, defaults = {}) {
  const clean = { ...raw };

  clean.founders = ensurePersonArray(clean.founders, defaults.founders).map((p) => {
    const row = normalizeFundacionPerson(p);
    if (!row.fullName && p?.fullName) row.fullName = String(p.fullName);
    return row;
  });
  clean.protectors = ensurePersonArray(clean.protectors, defaults.protectors).map((p) => {
    const row = normalizeFundacionPerson(p);
    if (!row.fullName && p?.fullName) row.fullName = String(p.fullName);
    return row;
  });
  clean.councilMembers = ensurePersonArray(clean.councilMembers, defaults.councilMembers).map(
    normalizeFundacionPerson
  );
  clean.dignitaries = ensurePersonArray(clean.dignitaries, defaults.dignitaries).map((d) =>
    normalizeFundacionDignitary({ ...d, role: d?.role || d?.position })
  );
  clean.beneficiaries = ensurePersonArray(clean.beneficiaries, defaults.beneficiaries).map(
    normalizeFundacionBeneficiary
  );

  if (!Array.isArray(clean.signers) || clean.signers.length === 0) {
    clean.signers = Array.isArray(defaults.signers)
      ? defaults.signers.map((s) => ({ name: s?.name || '', signature: s?.signature || '' }))
      : [{ name: '', signature: '' }];
  } else {
    clean.signers = clean.signers.map((s) => ({
      name: s?.name || '',
      signature: s?.signature || s?.name || '',
    }));
  }

  return clean;
}
