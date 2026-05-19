const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeFundacionPerson, FUNDACION_PERSON_FIELDS, personNameKey } = require('../utils/fundacionPersonSchema');

function findMatch(registry, nameInput) {
  const key = personNameKey(nameInput);
  if (!key) return null;
  const hit = registry.find((r) => r.key === key);
  return hit?.data ?? null;
}

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

test('findMatch matches normalized full name', () => {
  const juan = normalizeFundacionPerson({
    firstName: 'Juan',
    secondName: 'Carlos',
    lastName: 'Pérez',
    email: 'juan@test.com',
  });
  const registry = [
    { key: personNameKey('Juan Carlos Pérez'), name: 'Juan Carlos Pérez', data: juan },
  ];
  const hit = findMatch(registry, 'Juan Carlos Pérez');
  assert.equal(hit.email, 'juan@test.com');
});

test('findMatch ignores accent differences', () => {
  const person = normalizeFundacionPerson({ firstName: 'José', lastName: 'Muñoz', phone: '555' });
  const registry = [{ key: personNameKey('Jose Munoz'), name: 'Jose Munoz', data: person }];
  const hit = findMatch(registry, 'José Muñoz');
  assert.equal(hit.phone, '555');
});

test('pickFields never invents empty values', () => {
  const picked = pickFields({ firstName: 'Ana', lastName: '', phone: '123' }, FUNDACION_PERSON_FIELDS);
  assert.equal(picked.firstName, 'Ana');
  assert.equal(picked.phone, '123');
  assert.equal(picked.lastName, undefined);
});

test('beneficiary fill omits percentage from registry', () => {
  const data = normalizeFundacionPerson({
    firstName: 'María',
    lastName: 'López',
    birthDate: '1990-01-01',
    address: 'Calle 1',
    percentage: '99',
  });
  const fill = pickFields(data, ['birthDate', 'address', 'percentage']);
  assert.equal(fill.birthDate, '1990-01-01');
  assert.equal(fill.address, 'Calle 1');
  assert.equal(fill.percentage, '99');
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
