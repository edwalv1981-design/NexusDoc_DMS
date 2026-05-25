'use strict';

const FUNDACION_PERSON_FIELDS = [
  'fullName',
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
  if (!person.fullName && (raw.firstName || raw.secondName || raw.lastName)) {
    person.fullName = [raw.firstName, raw.secondName, raw.lastName].filter(Boolean).join(' ');
  }
  if (raw.birthPlace && !person.city) person.city = raw.birthPlace;
  return person;
}

function personDisplayName(person) {
  if (person.fullName && String(person.fullName).trim()) {
    return String(person.fullName).trim();
  }
  const first = String(person.firstName || '').trim();
  const second = String(person.secondName || '').trim();
  const last = String(person.lastName || '').trim();
  const fromParts = [first, second, last].filter(Boolean).join(' ');
  if (fromParts) return fromParts;

  return String(person.shareholder || '').trim();
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
