const test = require('node:test');
const assert = require('node:assert/strict');

// Mirror client registry helpers for unit tests (keep in sync with client/src/utils/fundacionPersonRegistry.js)
const {
  personDisplayName,
  normalizeFundacionPerson,
  FUNDACION_PERSON_FIELDS,
} = require('../utils/fundacionPersonSchema');

const personNameKey = (name) =>
  String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');

function findPersonInRegistry(registry, person) {
  const normalized = normalizeFundacionPerson(person);
  const candidates = [
    personDisplayName(normalized),
    [normalized.firstName, normalized.lastName].filter(Boolean).join(' '),
    normalized.lastName,
    normalized.firstName,
  ]
    .map((s) => personNameKey(s))
    .filter(Boolean);

  for (const key of candidates) {
    const hit = registry.find((r) => r.key === key);
    if (hit?.data) return hit.data;
  }

  const shortKey = personNameKey(
    [normalized.firstName, normalized.lastName].filter(Boolean).join(' ')
  );
  if (shortKey) {
    const fuzzy = registry.find((r) => {
      const data = normalizeFundacionPerson(r.data);
      return (
        personNameKey([data.firstName, data.lastName].filter(Boolean).join(' ')) === shortKey
      );
    });
    if (fuzzy?.data) return fuzzy.data;
  }

  return null;
}

test('findPersonInRegistry matches full name and first+last', () => {
  const juan = normalizeFundacionPerson({
    firstName: 'Juan',
    secondName: 'Carlos',
    lastName: 'Pérez',
    email: 'juan@test.com',
    phone: '6000',
  });
  const registry = [
    { key: personNameKey('Juan Carlos Pérez'), name: 'Juan Carlos Pérez', data: juan },
  ];

  const hitFull = findPersonInRegistry(registry, {
    firstName: 'Juan',
    secondName: 'Carlos',
    lastName: 'Pérez',
  });
  assert.equal(hitFull.email, 'juan@test.com');

  const hitShort = findPersonInRegistry(registry, { firstName: 'Juan', lastName: 'Pérez' });
  assert.equal(hitShort.phone, '6000');
});

test('FUNDACION_PERSON_FIELDS has 13 standard fields', () => {
  assert.equal(FUNDACION_PERSON_FIELDS.length, 13);
});
