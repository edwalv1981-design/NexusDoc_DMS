const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isKyciFormType,
  needsKyciDataMigration,
  splitBeneficiaryName,
  migrateLegacyKyciData,
  hasKyciIdentity,
} = require('../utils/kyciFormDataMigration');

test('isKyciFormType matches label variants', () => {
  assert.equal(isKyciFormType('Cumplimiento Individual'), true);
  assert.equal(isKyciFormType('Individual Compliance'), true);
  assert.equal(isKyciFormType('cumplimiento_individual'), true);
  assert.equal(isKyciFormType('Fondos Registros contables'), false);
});

test('needsKyciDataMigration detects legacy Fondos keys without KYCI identity', () => {
  assert.equal(
    needsKyciDataMigration({
      companyName: 'ACME',
      beneficiaryName: 'Juan Pérez',
      birthDate: '1990-01-01',
    }),
    true
  );
  assert.equal(
    needsKyciDataMigration({
      firstName: 'Juan',
      lastName: 'Pérez',
      companyName: 'ACME',
    }),
    false
  );
});

test('splitBeneficiaryName splits first token and remainder', () => {
  assert.deepEqual(splitBeneficiaryName('María Elena López'), {
    firstName: 'María',
    lastName: 'Elena López',
  });
  assert.deepEqual(splitBeneficiaryName('Solo'), {
    firstName: 'Solo',
    lastName: '',
  });
});

test('migrateLegacyKyciData maps Fondos keys to KYCI without overwriting identity', () => {
  const legacy = {
    companyName: 'Empresa SA',
    activities: 'Comercio',
    country: 'Panamá',
    beneficiaryName: 'Ana María Ruiz',
    birthDate: '1985-06-15',
    birthPlace: 'Ciudad de Panamá',
    address: 'Calle 50',
    fundsSource: ['Negocios'],
    custodyPhone: '6000-0000',
    custodyEmail: 'ana@example.com',
    signerName: 'Ana María Ruiz',
    date: '2026-05-01',
  };

  const { data, migrated, notes } = migrateLegacyKyciData(legacy);
  assert.equal(migrated, true);
  assert.equal(data.firstName, 'Ana');
  assert.equal(data.lastName, 'María Ruiz');
  assert.equal(data.birthDate, '1985-06-15');
  assert.equal(data.employer, 'Empresa SA');
  assert.equal(data.occupation, 'Comercio');
  assert.equal(data.phone, '6000-0000');
  assert.equal(data.email, 'ana@example.com');
  assert.equal(data.declarationName, 'Ana María Ruiz');
  assert.equal(data.declarationDate, '2026-05-01');
  assert.ok(notes.some((n) => n.includes('beneficiaryName')));
  assert.ok(hasKyciIdentity(data));
});

test('migrateLegacyKyciData does not overwrite existing KYCI fields', () => {
  const { data, migrated } = migrateLegacyKyciData({
    beneficiaryName: 'Legacy Name',
    firstName: 'Keep',
    lastName: 'Me',
    birthDate: '2000-01-01',
    birthPlace: 'New Place',
  });
  assert.equal(migrated, false);
  assert.equal(data.firstName, 'Keep');
  assert.equal(data.lastName, 'Me');
});

test('migrateLegacyKyciData leaves good KYCI-only drafts untouched', () => {
  const good = {
    firstName: 'Luis',
    lastName: 'García',
    birthDate: '1992-03-10',
    email: 'luis@test.com',
  };
  const { migrated } = migrateLegacyKyciData(good);
  assert.equal(migrated, false);
});
