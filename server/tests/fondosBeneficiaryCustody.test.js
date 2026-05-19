const test = require('node:test');
const assert = require('node:assert/strict');

const {
  FONDOS_BENEFICIARY_TO_CUSTODY,
  mergeBeneficiaryIntoCustody,
  pickBeneficiaryForCustody,
} = require('../utils/fondosBeneficiaryCustody');

test('mapping only includes fields present in both steps', () => {
  const fromKeys = FONDOS_BENEFICIARY_TO_CUSTODY.map((m) => m.from);
  const toKeys = FONDOS_BENEFICIARY_TO_CUSTODY.map((m) => m.to);
  assert.deepEqual(fromKeys, ['beneficiaryName', 'address']);
  assert.deepEqual(toKeys, ['custodyName', 'custodyAddress']);
  assert.ok(!fromKeys.includes('birthDate'));
  assert.ok(!fromKeys.includes('birthPlace'));
});

test('merge fills empty custody from beneficiary', () => {
  const base = {
    beneficiaryName: 'Ana Pérez',
    address: 'Calle 50, Ciudad',
    custodyName: '',
    custodyAddress: '',
  };
  const merged = mergeBeneficiaryIntoCustody(base, { onlyEmpty: true });
  assert.equal(merged.custodyName, 'Ana Pérez');
  assert.equal(merged.custodyAddress, 'Calle 50, Ciudad');
});

test('merge does not overwrite touched custody fields', () => {
  const base = {
    beneficiaryName: 'Ana Pérez',
    address: 'Calle 50',
    custodyName: 'Otro Nombre',
    custodyAddress: 'Otra dirección',
  };
  const merged = mergeBeneficiaryIntoCustody(base, { touched: { custodyName: true } });
  assert.equal(merged.custodyName, 'Otro Nombre');
  assert.equal(merged.custodyAddress, 'Calle 50');
});

test('merge never invents beneficiary data', () => {
  const picked = pickBeneficiaryForCustody({ beneficiaryName: '', address: '   ' });
  assert.equal(Object.keys(picked).length, 0);
});

test('merge syncs non-touched custody when beneficiary changes', () => {
  const base = {
    beneficiaryName: 'Nuevo Nombre',
    custodyName: 'Nombre Antiguo',
  };
  const merged = mergeBeneficiaryIntoCustody(base, { onlyEmpty: false });
  assert.equal(merged.custodyName, 'Nuevo Nombre');
});
