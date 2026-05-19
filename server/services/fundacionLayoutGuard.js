'use strict';

const corporacionLayoutGuard = require('./corporacionLayoutGuard');

const LAYOUT = corporacionLayoutGuard.LAYOUT;

function analyzeFormData(data = {}) {
  const council = Array.isArray(data.councilMembers)
    ? data.councilMembers.length
    : Array.isArray(data.directors)
      ? data.directors.length
      : 0;
  const protectors = Array.isArray(data.protectors) ? data.protectors.length : 0;
  const beneficiaries = Array.isArray(data.beneficiaries) ? data.beneficiaries.length : 0;
  const dignitaries = Array.isArray(data.dignitaries) ? data.dignitaries.length : 0;
  const actLen = String(data.foundationObjects || '').length;

  let density = 'normal';
  if (council > 6 || protectors > 4 || beneficiaries > 8 || dignitaries > 6 || actLen > 2200) {
    density = 'high';
  }
  if (council > 10 || beneficiaries > 14 || actLen > 5000) density = 'very_high';

  const tailKeepTogether = actLen < 3200 && council <= 8 && beneficiaries <= 16;

  return {
    density,
    tailKeepTogether,
    council,
    protectors,
    beneficiaries,
    dignitaries,
    activitiesChars: actLen,
  };
}

function getAdaptiveCss(plan) {
  const rules = [];
  if (plan.density === 'high' || plan.density === 'very_high') {
    rules.push(`
      body.layout-guard--compact { font-size: 9px; }
      .layout-guard--compact .card h2 { font-size: 11px; padding: 4px 6px; }
      .layout-guard--compact .hint { padding: 3px 6px; line-height: 1.15; }
      .layout-guard--compact .first-page-title h1 { font-size: 18px; }
      .layout-guard--compact th, .layout-guard--compact td { padding: 1px 2px; font-size: 8px; }
    `);
  }
  if (!plan.tailKeepTogether) {
    rules.push(`
      body.layout-guard--split-tail .tail-block {
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

function getFundacionPuppeteerPdfChromeOptions(logoDataUri = '') {
  return corporacionLayoutGuard.getCorporacionPuppeteerPdfChromeOptions(LAYOUT, logoDataUri);
}

module.exports = {
  LAYOUT,
  analyzeFormData,
  getAdaptiveCss,
  bodyClassForPlan,
  getFundacionPuppeteerPdfChromeOptions,
  refineAfterRender: corporacionLayoutGuard.refineAfterRender,
  getPrintPageMarginCss: corporacionLayoutGuard.getPrintPageMarginCss,
};
