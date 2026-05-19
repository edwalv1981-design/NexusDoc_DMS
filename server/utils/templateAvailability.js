'use strict';

const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const stablePdfForms = require('../config/stablePdfForms');

/** Claves de formType tal como se guardan en BD / UI del cliente. */
const CLIENT_FORM_TYPES = Object.freeze([
  stablePdfForms.FORM_TYPE_FONDOS_SFAR,
  stablePdfForms.FORM_TYPE_CORPORACION,
  stablePdfForms.FORM_TYPE_FUNDACION,
  'Cumplimiento Individual',
  'Cumplimiento Entidades',
]);

/** Filas del panel admin: id interno de plantilla → formType del cliente. */
const ADMIN_TEMPLATE_ROWS = Object.freeze([
  { id: 'fondos', formType: stablePdfForms.FORM_TYPE_FONDOS_SFAR, kind: 'pdf' },
  { id: 'corporacion', formType: stablePdfForms.FORM_TYPE_CORPORACION, kind: 'html' },
  { id: 'fundaciones', formType: stablePdfForms.FORM_TYPE_FUNDACION, kind: 'html' },
  { id: 'cumplimiento_individual', formType: 'Cumplimiento Individual', kind: 'html' },
  { id: 'cumplimiento_entidades', formType: 'Cumplimiento Entidades', kind: 'html' },
]);

function resolveTemplateLookup(formType) {
  if (
    stablePdfForms.isCorporacionPdfForm(formType) ||
    stablePdfForms.isFundacionPdfForm(formType) ||
    stablePdfForms.isKyciHtmlForm(formType) ||
    stablePdfForms.isKyceHtmlForm(formType)
  ) {
    return { htmlEngine: true, prefix: null, dbNames: [] };
  }

  const norm = String(formType || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('corporacion') || norm.includes('incorporation') || norm.includes('corporativo')) {
    return { htmlEngine: true, prefix: 'PTLC', dbNames: ['corporacion'] };
  }
  if (norm.includes('fundacion')) {
    return { htmlEngine: true, prefix: 'PTLF', dbNames: ['fundaciones'] };
  }
  if (norm.includes('fondos') || norm.includes('funds')) {
    return { htmlEngine: false, prefix: 'SFAR', dbNames: ['referencia_maestra', 'fondos'] };
  }
  if (norm.includes('cumplimiento individual') || norm.includes('individual compliance')) {
    return { htmlEngine: true, prefix: 'KYCI', dbNames: ['cumplimiento_individual'] };
  }
  if (norm.includes('cumplimiento entidades') || norm.includes('entity compliance')) {
    return { htmlEngine: true, prefix: 'KYCE', dbNames: ['cumplimiento_entidades'] };
  }

  return null;
}

/**
 * Motor HTML (Corporación / Fundaciones) no requiere PDF subido por admin.
 */
function isHtmlEngineForm(formType) {
  const lookup = resolveTemplateLookup(formType);
  return Boolean(lookup?.htmlEngine);
}

/**
 * Formulario interactivo disponible para el cliente.
 */
function isInteractiveFormAvailable(formType, templateStatusMap) {
  if (!formType) return false;
  if (isHtmlEngineForm(formType)) return true;
  if (!templateStatusMap) return false;
  return Boolean(templateStatusMap[formType]);
}

/**
 * Trámites que reutilizan el asistente de captura estilo Fondos (relleno PDF).
 */
function usesPdfWizardForm(formType) {
  const norm = String(formType || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return norm.includes('fondos') || norm.includes('funds');
}

async function checkTemplateExists(formType, DocumentTemplate) {
  const lookup = resolveTemplateLookup(formType);
  if (!lookup) return false;
  if (lookup.htmlEngine) return true;

  const templatesDir = path.join(__dirname, '../templates');
  const localPath = path.join(templatesDir, `${lookup.prefix}.pdf`);
  if (fs.existsSync(localPath)) return true;

  if (lookup.prefix === 'SFAR') {
    const legacyPath = path.join(__dirname, '../../templates/referencia_maestra.pdf');
    if (fs.existsSync(legacyPath)) return true;
  }

  if (!DocumentTemplate) return false;

  const dbTemplate = await DocumentTemplate.findOne({
    where: { name: { [Op.in]: lookup.dbNames } },
  });

  return Boolean(dbTemplate?.fileData);
}

async function getClientTemplateStatusMap(DocumentTemplate) {
  const entries = await Promise.all(
    CLIENT_FORM_TYPES.map(async (formType) => [formType, await checkTemplateExists(formType, DocumentTemplate)])
  );
  return Object.fromEntries(entries);
}

async function getAdminTemplateStatusRows(DocumentTemplate) {
  const rows = [];
  for (const row of ADMIN_TEMPLATE_ROWS) {
    const available =
      row.kind === 'html' ? true : await checkTemplateExists(row.formType, DocumentTemplate);
    rows.push({
      id: row.id,
      formType: row.formType,
      kind: row.kind,
      available,
    });
  }
  return rows;
}

function adminTemplateIdToLabel(id) {
  const labels = {
    fondos: 'Declaración de Fondos',
    corporacion: 'Incorporación',
    fundaciones: 'Fundaciones',
    cumplimiento_individual: 'Cumplimiento Individual',
    cumplimiento_entidades: 'Cumplimiento Entidades',
  };
  return labels[id] || id;
}

module.exports = {
  CLIENT_FORM_TYPES,
  ADMIN_TEMPLATE_ROWS,
  resolveTemplateLookup,
  isHtmlEngineForm,
  isInteractiveFormAvailable,
  usesPdfWizardForm,
  checkTemplateExists,
  getClientTemplateStatusMap,
  getAdminTemplateStatusRows,
  adminTemplateIdToLabel,
};
