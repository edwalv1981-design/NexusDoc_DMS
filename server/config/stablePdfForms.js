'use strict';

/**
 * Contrato estable para tipos de trámite con PDF en producción.
 *
 * **Blindado (no renombrar sin actualizar cliente + CI):**
 * - `FORM_TYPE_CORPORACION` → motor HTML `corporacionHtmlPdfService`.
 * - `FORM_TYPE_FONDOS_SFAR` → plantilla `fondos` + `scripts/fill_pdf_expert.py`.
 *
 * Otros tipos siguen en los mapas para no romper trámites ya guardados en BD.
 */

const FORM_TYPE_FONDOS_SFAR = 'Fondos Registros contables';
const FORM_TYPE_CORPORACION = 'Corporación';

/** formType (DB / UI) → nombre interno de plantilla / motor. */
const PDF_TEMPLATE_BY_FORM_TYPE = Object.freeze({
  [FORM_TYPE_FONDOS_SFAR]: 'fondos',
  [FORM_TYPE_CORPORACION]: 'corporacion',
  Fundaciones: 'fundaciones',
  'Cumplimiento Individual': 'cumplimiento_individual',
  'Cumplimiento Entidades': 'cumplimiento_entidades',
});

/** Prefijo de código único por tipo (auth / usuarios). */
const UNIQUE_CODE_PREFIX_BY_FORM_TYPE = Object.freeze({
  [FORM_TYPE_FONDOS_SFAR]: 'SFAR',
  [FORM_TYPE_CORPORACION]: 'PTLC',
  Fundaciones: 'PTLF',
  'Cumplimiento Individual': 'KYCI',
  'Cumplimiento Entidades': 'KYCE',
});

function getPdfTemplateNameForForm(formType) {
  return PDF_TEMPLATE_BY_FORM_TYPE[formType] || formType || 'fondos';
}

function isCorporacionPdfForm(formType) {
  return getPdfTemplateNameForForm(formType) === 'corporacion';
}

/**
 * Prefijo del nombre de archivo al descargar PDF (lógica tolerante a variantes de texto).
 */
function getPdfDownloadFilenamePrefix(formType) {
  const normType = String(formType || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (normType.includes('fondos')) return UNIQUE_CODE_PREFIX_BY_FORM_TYPE[FORM_TYPE_FONDOS_SFAR];
  if (normType.includes('corporacion') || normType.includes('corporativos')) {
    return UNIQUE_CODE_PREFIX_BY_FORM_TYPE[FORM_TYPE_CORPORACION];
  }
  if (normType.includes('fundacion')) return 'PTLF';
  if (normType.includes('cumplimiento individual')) return 'KYCI';
  if (normType.includes('cumplimiento entidades')) return 'KYCE';
  return 'DOC';
}

module.exports = {
  FORM_TYPE_FONDOS_SFAR,
  FORM_TYPE_CORPORACION,
  PDF_TEMPLATE_BY_FORM_TYPE,
  UNIQUE_CODE_PREFIX_BY_FORM_TYPE,
  getPdfTemplateNameForForm,
  isCorporacionPdfForm,
  getPdfDownloadFilenamePrefix,
};
