'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const g = require('../services/corporacionLayoutGuard');

describe('corporacionLayoutGuard', () => {
  it('assertCorporacionPdfLayoutInvariants no lanza con LAYOUT por defecto', () => {
    assert.doesNotThrow(() => g.assertCorporacionPdfLayoutInvariants());
  });

  it('getPdfBodyTopMarginPx incluye buffer sobre getContentStartPx', () => {
    const start = g.getContentStartPx(g.LAYOUT);
    const top = g.getPdfBodyTopMarginPx(g.LAYOUT);
    assert.ok(top >= start);
    assert.equal(top - start, g.LAYOUT.PDF_TOP_MARGIN_BUFFER_PX);
  });

  it('getPuppeteerPdfMargins usa mm en top y mantiene laterales', () => {
    const m = g.getPuppeteerPdfMargins(g.LAYOUT);
    assert.match(m.top, /^\d+\.\d{2}mm$/);
    assert.equal(m.left, g.LAYOUT.H_INSET);
    assert.equal(m.right, g.LAYOUT.H_INSET);
    assert.equal(m.bottom, g.LAYOUT.BOTTOM_INSET);
  });

  it('getPrintPageMarginCss es top right bottom left en mm', () => {
    const s = g.getPrintPageMarginCss(g.LAYOUT);
    const parts = s.trim().split(/\s+/);
    assert.equal(parts.length, 4);
    assert.match(parts[0], /mm$/);
    assert.match(parts[1], /mm$/);
    assert.match(parts[2], /mm$/);
    assert.match(parts[3], /mm$/);
  });

  it('headerTemplate escapa comillas en data URI (no rompe atributo src)', () => {
    const evil = 'data:image/png;base64,AAA"BBB';
    const { headerTemplate } = g.buildPuppeteerHeaderFooterTemplates(g.LAYOUT, evil);
    assert.ok(headerTemplate.includes('AAA&quot;BBB'));
    assert.ok(!headerTemplate.includes('AAA"BBB'));
  });

  it('getCorporacionPuppeteerPdfChromeOptions expone margin + header/footer', () => {
    const o = g.getCorporacionPuppeteerPdfChromeOptions(g.LAYOUT, '');
    assert.equal(o.displayHeaderFooter, true);
    assert.ok(o.headerTemplate.includes('PANAMA TAX'));
    assert.ok(typeof o.footerTemplate === 'string');
  });

  it('analyzeFormData: muchos directores/accionistas (techo smoke 25) → very_high y split de cola', () => {
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

  it('analyzeFormData: volumen medio → high pero tailKeepTogether true', () => {
    const plan = g.analyzeFormData({
      directors: Array.from({ length: 7 }, (_, i) => ({ i })),
      shareholders: Array.from({ length: 10 }, (_, i) => ({ i })),
      companyActivities: 'corta',
    });
    assert.equal(plan.density, 'high');
    assert.equal(plan.tailKeepTogether, true);
  });
});
