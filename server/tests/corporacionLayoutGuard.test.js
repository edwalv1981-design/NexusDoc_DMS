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
});
