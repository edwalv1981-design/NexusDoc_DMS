'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../scripts/corporacionPdfSmokeLib');

describe('corporacionPdfSmokeLib (techo accionistas)', () => {
  it('buildHeavyPdfStressSpec por defecto usa 25 accionistas y 15 directores', () => {
    const s = lib.buildHeavyPdfStressSpec();
    assert.equal(s.shareholderCount, 25);
    assert.equal(s.directorCount, 15);
    assert.equal(s.payload.shareholders.length, 25);
    assert.equal(s.payload.directors.length, 15);
    assert.equal(s.ceilings.shareholders, 25);
    assert.ok(s.activitiesCharLength > 5000);
    assert.ok(s.minExpectedPages >= 3);
    assert.ok(s.minBytes >= 100_000);
  });

  it('buildHeavyPdfStressSpec rechaza más accionistas que el techo', () => {
    assert.throws(
      () => lib.buildHeavyPdfStressSpec({ shareholders: 26 }),
      /supera el techo/
    );
  });

  it('buildHeavyPdfStressSpec permite valores bajo el techo', () => {
    const s = lib.buildHeavyPdfStressSpec({ shareholders: 20, directors: 12 });
    assert.equal(s.shareholderCount, 20);
    assert.equal(s.directorCount, 12);
    assert.ok(s.minExpectedPages >= 3);
  });
});
