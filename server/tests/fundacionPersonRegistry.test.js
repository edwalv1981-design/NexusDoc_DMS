const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeFundacionPerson, FUNDACION_PERSON_FIELDS, personNameKey } = require('../utils/fundacionPersonSchema');

function pickFields(source = {}, fieldList = []) {
  const out = {};
  for (const key of fieldList) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      out[key] = value;
    }
  }
  return out;
}

test('pickFields never invents empty values', () => {
  const picked = pickFields({ fullName: 'Ana Perez', phone: '123' }, FUNDACION_PERSON_FIELDS);
  assert.equal(picked.fullName, 'Ana Perez');
  assert.equal(picked.phone, '123');
});

test('FUNDACION_PERSON_FIELDS has 11 standard fields', () => {
  assert.equal(FUNDACION_PERSON_FIELDS.length, 11);
});

test('normalizeFundacionPerson merges legacy separate name fields into fullName', () => {
  const { personDisplayName } = require('../utils/fundacionPersonSchema');
  const p = normalizeFundacionPerson({
    firstName: 'Edwin',
    secondName: 'Eduardo Alvarez Vivero',
    lastName: 'Alvarez Vivero',
  });
  assert.equal(p.fullName, 'Edwin Eduardo Alvarez Vivero Alvarez Vivero');
  assert.equal(personDisplayName(p), 'Edwin Eduardo Alvarez Vivero Alvarez Vivero');
});

test('personDisplayName prefers fullName over parts', () => {
  const { personDisplayName } = require('../utils/fundacionPersonSchema');
  const p = normalizeFundacionPerson({ fullName: 'Juan Carlos Perez' });
  assert.equal(personDisplayName(p), 'Juan Carlos Perez');
});
