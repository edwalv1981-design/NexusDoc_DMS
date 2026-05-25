'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const g = require('../services/corporacionLayoutGuard');

describe('corporacionLayoutGuard', () => {
  it('assertCorporacionPdfLayoutInvariants does not throw with default LAYOUT', () => {
    assert.doesNotThrow(() => g.assertCorporacionPdfLayoutInvariants());
  });

  it('getPuppeteerPdfMargins returns mm strings for all sides', () => {
    const m = g.getPuppeteerPdfMargins(g.LAYOUT);
    for (const side of ['top', 'bottom', 'left', 'right']) {
      assert.match(m[side], /mm$/);
    }
  });

  it('getPrintPageMarginCss produces four mm values', () => {
    const s = g.getPrintPageMarginCss(g.LAYOUT);
    const parts = s.trim().split(/\s+/);
    assert.equal(parts.length, 4);
    parts.forEach(p => assert.match(p, /mm$/));
  });

  it('getCorporacionPuppeteerPdfChromeOptions returns only margin (no displayHeaderFooter)', () => {
    const o = g.getCorporacionPuppeteerPdfChromeOptions(g.LAYOUT);
    assert.ok(o.margin);
    assert.equal(o.displayHeaderFooter, undefined);
    assert.equal(o.headerTemplate, undefined);
    assert.equal(o.footerTemplate, undefined);
  });

  it('analyzeFormData: many directors/shareholders → very_high and split tail', () => {
    const directors = Array.from({ length: 15 }, (_, i) => ({ i }));
    const shareholders = Array.from({ length: 25 }, (_, i) => ({ i }));
    const plan = g.analyzeFormData({
      directors,
      shareholders,
      companyActivities: 'x'.repeat(5200),
    });
    assert.equal(plan.density, 'very_high');
    assert.equal(plan.tailKeepTogether, false);
    assert.equal(plan.directors, 15);
    assert.equal(plan.shareholders, 25);
  });

  it('analyzeFormData: medium volume → high but tailKeepTogether true', () => {
    const plan = g.analyzeFormData({
      directors: Array.from({ length: 7 }, (_, i) => ({ i })),
      shareholders: Array.from({ length: 10 }, (_, i) => ({ i })),
      companyActivities: 'corta',
    });
    assert.equal(plan.density, 'high');
    assert.equal(plan.tailKeepTogether, true);
  });
});
