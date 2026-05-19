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
  const picked = pickFields({ firstName: 'Ana', lastName: '', phone: '123' }, FUNDACION_PERSON_FIELDS);
  assert.equal(picked.firstName, 'Ana');
  assert.equal(picked.phone, '123');
  assert.equal(picked.lastName, undefined);
});

test('FUNDACION_PERSON_FIELDS has 13 standard fields', () => {
  assert.equal(FUNDACION_PERSON_FIELDS.length, 13);
});

test('personDisplayName avoids duplicating lastName already in secondName', () => {
  const { personDisplayName } = require('../utils/fundacionPersonSchema');
  const p = normalizeFundacionPerson({
    firstName: 'Edwin',
    secondName: 'Eduardo Alvarez Vivero',
    lastName: 'Alvarez Vivero',
  });
  assert.equal(personDisplayName(p), 'Edwin Eduardo Alvarez Vivero');
});
