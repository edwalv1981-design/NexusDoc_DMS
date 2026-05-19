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
  return person;
}

function personDisplayName(person) {
  return [person.firstName, person.secondName, person.lastName].filter(Boolean).join(' ').trim()
    || String(person.fullName || '').trim();
}

function personHasData(person) {
  return Boolean(personDisplayName(person));
}

module.exports = {
  FUNDACION_PERSON_FIELDS,
  emptyFundacionPerson,
  normalizeFundacionPerson,
  personDisplayName,
  personHasData,
};
