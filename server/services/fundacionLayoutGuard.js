'use strict';

const A4_HEIGHT_PX = 1123;
const DEFAULT_BOTTOM_PX = 48;

const LAYOUT = Object.freeze({
  H_INSET: '18mm',
  BOTTOM_INSET: '12mm',
  HEADER_LOGO_H: 40,
  RUNNING_HEADER_PADDING_TOP: 16,
  RUNNING_HEADER_PADDING_BOTTOM: 18,
  DOC_BODY_GAP_BELOW_HEADER: 4,
  PDF_TOP_MARGIN_BUFFER_PX: 22,
});

function pxToMmString(px) {
  return `${((px * 25.4) / 96).toFixed(2)}mm`;
}

function getHeaderBandPx(layout) {
  return layout.RUNNING_HEADER_PADDING_TOP + layout.HEADER_LOGO_H + layout.RUNNING_HEADER_PADDING_BOTTOM;
}

function getContentStartPx(layout) {
  return getHeaderBandPx(layout) + layout.DOC_BODY_GAP_BELOW_HEADER;
}

function getPdfBodyTopMarginPx(layout = LAYOUT) {
  return getContentStartPx(layout) + layout.PDF_TOP_MARGIN_BUFFER_PX;
}

function getPuppeteerPdfMargins(layout = LAYOUT) {
  return {
    top: pxToMmString(getPdfBodyTopMarginPx(layout)),
    left: layout.H_INSET,
    right: layout.H_INSET,
    bottom: layout.BOTTOM_INSET,
  };
}

function analyzeFormData(data = {}) {
  const founders = Array.isArray(data.founders) ? data.founders.length : 0;
  const council = Array.isArray(data.councilMembers) ? data.councilMembers.length : 0;
  const beneficiaries = Array.isArray(data.beneficiaries) ? data.beneficiaries.length : 0;
  const actLen = String(data.foundationObjects || '').length;

  let density = 'normal';
  if (founders > 4 || council > 6 || beneficiaries > 8 || actLen > 2000) density = 'high';

  return { density, founders, council, beneficiaries, actLen };
}

module.exports = {
  LAYOUT,
  getPdfBodyTopMarginPx,
  getPuppeteerPdfMargins,
  analyzeFormData,
};
