'use strict';

const FUNDACION_PERSON_FIELDS = [
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

function emptyFundacionPerson() {
  return Object.fromEntries(FUNDACION_PERSON_FIELDS.map((k) => [k, '']));
}

function normalizeFundacionPerson(raw = {}) {
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

function personDisplayName(person) {
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

function dignitaryDisplayName(d) {
  return String(d?.fullName || '').trim() || personDisplayName(normalizeFundacionPerson(d || {}));
}

function beneficiaryDisplayName(b) {
  return (
    String(b?.shareholder || b?.fullName || '').trim() ||
    personDisplayName(normalizeFundacionPerson(b || {}))
  );
}

function personNameKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function personHasData(person) {
  return Boolean(personDisplayName(person));
}

module.exports = {
  FUNDACION_PERSON_FIELDS,
  emptyFundacionPerson,
  normalizeFundacionPerson,
  personDisplayName,
  personNameKey,
  dignitaryDisplayName,
  beneficiaryDisplayName,
  personHasData,
};
