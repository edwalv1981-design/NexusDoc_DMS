'use strict';

/**
 * Layout-analysis helper for Corporación / Incorporación PDF (HTML).
 *
 * Provides:
 *  - Adaptive CSS for high-density forms (many directors/shareholders).
 *  - Page-break heuristics for the tail block (activities + declaration).
 *  - Puppeteer `page.pdf()` margin options (simple, no header/footer template).
 *  - Runtime refinement after DOM render (optional).
 */

const A4_HEIGHT_PX = 1123; // ~297 mm @ 96 dpi

/** Margins handed to Puppeteer's `page.pdf({ margin })`. */
const LAYOUT = Object.freeze({
  TOP_INSET: '10mm',
  BOTTOM_INSET: '10mm',
  H_INSET: '12mm',
});

/* ── Margin helpers ──────────────────────────────────────────────── */

function mmToPx(mmStr) {
  const n = parseFloat(String(mmStr).replace(/mm\s*$/i, ''));
  if (Number.isNaN(n)) return 38;
  return (n * 96) / 25.4;
}

function pxToMmString(px, decimals = 2) {
  return `${((px * 25.4) / 96).toFixed(decimals)}mm`;
}

function getPuppeteerPdfMargins(layout = LAYOUT) {
  return {
    top: layout.TOP_INSET,
    bottom: layout.BOTTOM_INSET,
    left: layout.H_INSET,
    right: layout.H_INSET,
  };
}

/**
 * CSS `margin` shorthand (top right bottom left) for @page rules.
 * Kept for backward compat with fundacionLayoutGuard.
 */
function getPrintPageMarginCss(layout = LAYOUT) {
  const m = getPuppeteerPdfMargins(layout);
  return `${m.top} ${m.right} ${m.bottom} ${m.left}`;
}

/* ── Puppeteer PDF options ───────────────────────────────────────── */

/**
 * Returns options for `page.pdf({ ... })`: margins only, no displayHeaderFooter.
 * The logo is rendered directly inside the HTML body.
 */
function getCorporacionPuppeteerPdfChromeOptions(layout = LAYOUT) {
  return {
    margin: getPuppeteerPdfMargins(layout),
  };
}

/* ── Layout invariant assertion ──────────────────────────────────── */

function assertCorporacionPdfLayoutInvariants(layout = LAYOUT) {
  const m = getPuppeteerPdfMargins(layout);
  for (const side of ['top', 'bottom', 'left', 'right']) {
    if (typeof m[side] !== 'string' || !m[side].endsWith('mm')) {
      throw new Error(`corporacionLayoutGuard: margin.${side} must be a string ending in mm`);
    }
    const val = parseFloat(m[side]);
    if (Number.isNaN(val) || val < 0 || val > 50) {
      throw new Error(`corporacionLayoutGuard: margin.${side} out of range (${m[side]})`);
    }
  }
}

/* ── Form data analysis ──────────────────────────────────────────── */

function analyzeFormData(data = {}) {
  const directors = Array.isArray(data.directors) ? data.directors.length : 0;
  const shareholders = Array.isArray(data.shareholders) ? data.shareholders.length : 0;
  const dignitaries = Array.isArray(data.dignitaries) ? data.dignitaries.length : 0;
  const signers = Array.isArray(data.signers) ? data.signers.length : 0;
  const actLen = String(data.companyActivities || '').length;

  let density = 'normal';
  if (directors > 6 || shareholders > 12 || dignitaries > 5 || actLen > 2200) density = 'high';
  if (directors > 10 || shareholders > 22 || dignitaries > 10 || actLen > 5000) density = 'very_high';

  const tailKeepTogether = actLen < 3200 && directors <= 8 && shareholders <= 16 && signers <= 3;

  return { density, tailKeepTogether, directors, shareholders, dignitaries, signers, activitiesChars: actLen };
}

/* ── Adaptive CSS ────────────────────────────────────────────────── */

function getAdaptiveCss(plan) {
  const rules = [];

  if (plan.density === 'high' || plan.density === 'very_high') {
    rules.push(`
      body.layout-guard--compact { font-size: 8.5px; }
      .layout-guard--compact table th { padding: 1px 2px; font-size: 7.5px; }
      .layout-guard--compact table td { padding: 1px 2px; font-size: 7px; }
    `);
  }

  if (!plan.tailKeepTogether) {
    rules.push(`
      body.layout-guard--split-tail .card--activities {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
    `);
  }

  return rules.join('\n');
}

function bodyClassForPlan(plan) {
  const c = ['layout-guard'];
  if (plan.density === 'high' || plan.density === 'very_high') c.push('layout-guard--compact');
  if (!plan.tailKeepTogether) c.push('layout-guard--split-tail');
  return c.join(' ');
}

/* ── Post-render refinement ──────────────────────────────────────── */

/**
 * After DOM is painted: if the activities section is taller than one page,
 * allow it to break across pages instead of forcing a bad clip.
 */
async function refineAfterRender(page) {
  const topPx = mmToPx(LAYOUT.TOP_INSET);
  const bottomPx = mmToPx(LAYOUT.BOTTOM_INSET);
  const usable = A4_HEIGHT_PX - topPx - bottomPx;

  await page.evaluate((usableHeight) => {
    const activities = document.querySelector('.card--activities');
    if (!activities) return;
    if (activities.offsetHeight > usableHeight * 0.92) {
      const s = document.createElement('style');
      s.id = 'layout-guard-runtime';
      s.textContent = `.card--activities { page-break-inside: auto !important; break-inside: auto !important; }`;
      document.head.appendChild(s);
    }
  }, usable);
}

/* ── Page estimate (logging / testing) ───────────────────────────── */

function estimateMinPages(plan, data = {}) {
  let units = 12;
  units += (plan.directors || 0) * 2.2;
  units += (plan.shareholders || 0) * 1.1;
  units += Math.min(8, String(data.companyActivities || '').length / 400);
  const pages = Math.max(1, Math.ceil(units / 28));
  return { estimatePages: pages, units: Math.round(units * 10) / 10 };
}

/* ── Exports ─────────────────────────────────────────────────────── */

module.exports = {
  LAYOUT,
  getPuppeteerPdfMargins,
  getPrintPageMarginCss,
  getCorporacionPuppeteerPdfChromeOptions,
  assertCorporacionPdfLayoutInvariants,
  analyzeFormData,
  getAdaptiveCss,
  bodyClassForPlan,
  refineAfterRender,
  estimateMinPages,
  pxToMmString,
  mmToPx,
  _constants: { A4_HEIGHT_PX, LAYOUT },
};
