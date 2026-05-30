'use strict';

/**
 * Enrutamiento del asistente de formularios en el dashboard cliente.
 * Compartido entre cliente (Vite) y tests del servidor.
 */

function normalizeFormTypeLabel(formType) {
  return String(formType || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function resolveCanonicalFormType(formType) {
  const norm = normalizeFormTypeLabel(formType);
  if (!norm) return formType || '';

  if (
    norm.includes('cumplimiento individual') ||
    norm.includes('individual compliance') ||
    norm === 'cumplimiento_individual' ||
    norm === 'kyci'
  ) {
    return 'Cumplimiento Individual';
  }
  if (
    norm.includes('cumplimiento entidades') ||
    norm.includes('entity compliance') ||
    norm === 'cumplimiento_entidades' ||
    norm === 'kyce'
  ) {
    return 'Cumplimiento Entidades';
  }
  if (norm.includes('fondos') || norm.includes('funds') || norm === 'sfar') {
    return 'Fondos Registros contables';
  }
  if (norm.includes('corporacion') || norm.includes('incorporation') || norm.includes('corporativo')) {
    return 'Corporación';
  }
  if (norm.includes('fundacion')) {
    return 'Fundaciones';
  }
  return formType;
}

function usesSchemaWizard(formType) {
  const canonical = resolveCanonicalFormType(formType);
  const baseTypes = ['Fondos Registros contables', 'Corporación', 'Fundaciones', 'Cumplimiento Individual', 'Cumplimiento Entidades'];
  return !baseTypes.includes(canonical);
}

function usesDedicatedKyciForm(formType) {
  return resolveCanonicalFormType(formType) === 'Cumplimiento Individual';
}

function usesDedicatedKyceForm(formType) {
  return resolveCanonicalFormType(formType) === 'Cumplimiento Entidades';
}

function usesFondosWizard(formType) {
  return resolveCanonicalFormType(formType) === 'Fondos Registros contables';
}

function isKyciFormType(formType) {
  return resolveCanonicalFormType(formType) === 'Cumplimiento Individual';
}

function isKyceFormType(formType) {
  return resolveCanonicalFormType(formType) === 'Cumplimiento Entidades';
}

module.exports = {
  normalizeFormTypeLabel,
  resolveCanonicalFormType,
  usesSchemaWizard,
  usesFondosWizard,
  usesDedicatedKyciForm,
  usesDedicatedKyceForm,
  isKyciFormType,
  isKyceFormType,
};
