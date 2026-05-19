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

export function emptyFundacionPerson() {
  return Object.fromEntries(FUNDACION_PERSON_FIELDS.map((k) => [k, '']));
}

export function emptyFundacionDignitary(role = '') {
  return { role, registrationNumber: '', ...emptyFundacionPerson() };
}

export function emptyFundacionBeneficiary() {
  return { percentage: '', ...emptyFundacionPerson() };
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

export function personDisplayName(person) {
  return [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ').trim()
    || String(person.fullName || '').trim();
}

export function personNameKey(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
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
 * Registro en memoria de personas del formulario, indexado por nombre normalizado.
 * exclude: { arrayName, index } omite la fila que se está editando.
 */
export function buildPersonRegistry(formData, exclude = null) {
  const map = new Map();

  const addPerson = (raw, extra = {}) => {
    const merged = mergePersonRecords(normalizeFundacionPerson(raw), extra);
    const name = personDisplayName(merged);
    const key = personNameKey(name);
    if (!key) return;
    const prev = map.get(key) || {};
    map.set(key, mergePersonRecords(prev, snapshotFromPerson(merged)));
  };

  const skip = (arrayName, index) =>
    exclude && exclude.arrayName === arrayName && exclude.index === index;

  (formData.founders || []).forEach((p, i) => {
    if (!skip('founders', i)) addPerson(p);
  });
  (formData.protectors || []).forEach((p, i) => {
    if (!skip('protectors', i)) addPerson(p);
  });
  (formData.councilMembers || []).forEach((p, i) => {
    if (!skip('councilMembers', i)) addPerson(p);
  });
  (formData.dignitaries || []).forEach((d, i) => {
    if (!skip('dignitaries', i)) {
      addPerson(d, { role: d.role, registrationNumber: d.registrationNumber });
    }
  });
  (formData.beneficiaries || []).forEach((b, i) => {
    if (!skip('beneficiaries', i)) {
      addPerson(b, { percentage: b.percentage });
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
