const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeFundacionPerson,
  personNameKey,
  personDisplayName,
} = require('../utils/fundacionPersonSchema');

function mergePersonRecords(target = {}, source = {}) {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      out[key] = value;
    }
  }
  return out;
}

const CORP_DIRECTOR_FIELDS = [
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

function buildCorporacionPersonRegistry(formData, exclude = null) {
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

  (formData.directors || []).forEach((d, i) => {
    if (!skip('directors', i)) addPerson(d);
  });
  (formData.dignitaries || []).forEach((d, i) => {
    if (!skip('dignitaries', i) && d.fullName) {
      addPerson(
        { fullName: d.fullName, birthDate: d.birthDate, passport: d.passport },
        { role: d.role }
      );
    }
  });
  (formData.shareholders || []).forEach((s, i) => {
    if (!skip('shareholders', i) && s.name) addPerson({ fullName: s.name, name: s.name, address: s.address });
  });

  return Array.from(map.entries()).map(([key, data]) => ({
    key,
    name: personDisplayName(data) || data.fullName || data.name,
    data,
  }));
}

function findMatch(registry, nameInput) {
  const key = personNameKey(nameInput);
  if (!key) return null;
  const hit = registry.find((r) => r.key === key);
  return hit?.data ?? null;
}

test('corporacion registry merges director fields for accent-insensitive match', () => {
  const formData = {
    directors: [
      {
        firstName: 'Juan',
        lastName: 'Pérez',
        birthDate: '1980-01-01',
        passport: 'PA123',
        address: 'Calle 1',
      },
    ],
    dignitaries: [],
    shareholders: [{ name: 'Juan Pérez', address: 'Calle 1' }],
  };
  const reg = buildCorporacionPersonRegistry(formData);
  const hit = findMatch(reg, 'Juan Perez');
  assert.equal(hit.birthDate, '1980-01-01');
  assert.equal(hit.passport, 'PA123');
  assert.equal(hit.address, 'Calle 1');
});

test('corporacion director pick omits empty invented fields', () => {
  const patch = pickFields(
    normalizeFundacionPerson({ firstName: 'Ana', lastName: 'López', phone: '', email: 'a@test.com' }),
    CORP_DIRECTOR_FIELDS
  );
  assert.equal(patch.firstName, 'Ana');
  assert.equal(patch.email, 'a@test.com');
  assert.equal(patch.phone, undefined);
});

test('corporacion registry exclude omits editing row', () => {
  const formData = {
    directors: [{ firstName: 'Solo', lastName: 'Uno', passport: 'X' }],
    dignitaries: [],
    shareholders: [],
  };
  const reg = buildCorporacionPersonRegistry(formData, { arrayName: 'directors', index: 0 });
  assert.equal(reg.length, 0);
});
