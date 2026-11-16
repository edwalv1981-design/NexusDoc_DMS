'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../services/signatureService');

describe('signatureService', () => {
  it('identityMatch por cédula en el certificado', () => {
    assert.equal(svc.identityMatch({ idNumber: '0900000003', name: 'X' }, { serialNumber: 'IDCEC-0900000003' }), 'match');
    assert.equal(svc.identityMatch({ idNumber: '1712345678', name: 'Ana Pérez Mora' }, { commonName: 'LUIS GOMEZ', serialNumber: '0999999999' }), 'no_match');
  });
  it('identityMatch por nombre (sin acentos ni mayúsculas)', () => {
    assert.equal(svc.identityMatch({ idNumber: '', name: 'Ana Pérez Mora' }, { commonName: 'ANA PEREZ' }), 'match');
    assert.equal(svc.identityMatch({ name: 'Ana' }, null), 'unknown');
  });
  it('estados que requieren revisión', () => {
    assert.ok(svc.NEEDS_REVIEW.has('NO_DIGITAL'));
    assert.ok(svc.NEEDS_REVIEW.has('DIGITAL_UNTRUSTED'));
    assert.ok(!svc.NEEDS_REVIEW.has('DIGITAL_VALID'));
    assert.ok(!svc.NEEDS_REVIEW.has('DIGITAL_INVALID'));
  });
  it('applyReview registra quién, cuándo y el estado final', () => {
    const r = svc.applyReview({ verification: { result: 'NO_DIGITAL', review: { status: 'pending' } } }, { decision: 'rejected', note: 'sin firma', admin: { id: 'a1', email: 'a@x.com' } });
    assert.equal(r.signatureStatus, svc.STATUS.REJECTED);
    assert.equal(r.verification.review.status, 'rejected');
    assert.equal(r.verification.review.note, 'sin firma');
    assert.equal(r.verification.result, 'NO_DIGITAL');
  });
  it('sha256', () => {
    assert.equal(svc.sha256(Buffer.from('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
