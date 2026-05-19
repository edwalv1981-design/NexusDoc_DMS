'use strict';

/**
 * Maps legacy Fondos/SFAR wizard keys saved under Cumplimiento Individual drafts
 * (pre b2ff62e) to KYCI schema keys from pdfFormSchemas.
 */

/** Keys that only existed on the old shared Fondos wizard used for KYCI. */
const LEGACY_ONLY_KEYS = Object.freeze([
  'companyName',
  'activities',
  'beneficiaryName',
  'custodyName',
  'custodyPhone',
  'custodyEmail',
  'custodyAddress',
  'signerName',
]);

/** Legacy `date` field from Fondos step 3 (KYCI uses declarationDate). */
const LEGACY_DATE_KEY = 'date';

const KYCI_IDENTITY_KEYS = Object.freeze(['firstName', 'lastName']);

function normalizeFormTypeLabel(formType) {
  return String(formType || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isKyciFormType(formType) {
  const norm = normalizeFormTypeLabel(formType);
  return (
    norm.includes('cumplimiento individual') ||
    norm.includes('individual compliance') ||
    norm === 'cumplimiento_individual' ||
    norm === 'kyci'
  );
}

function hasNonEmptyValue(data, key) {
  const value = data?.[key];
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== '';
}

function hasLegacyMarkers(data) {
  if (!data || typeof data !== 'object') return false;
  if (LEGACY_ONLY_KEYS.some((key) => hasNonEmptyValue(data, key))) return true;
  if (hasNonEmptyValue(data, LEGACY_DATE_KEY) && !hasNonEmptyValue(data, 'declarationDate')) {
    return true;
  }
  return false;
}

function hasKyciIdentity(data) {
  return KYCI_IDENTITY_KEYS.some((key) => hasNonEmptyValue(data, key));
}

function needsKyciDataMigration(data) {
  return hasLegacyMarkers(data) && !hasKyciIdentity(data);
}

/**
 * Split "Nombre Apellido1 Apellido2" → first token firstName, rest lastName.
 */
function splitBeneficiaryName(fullName) {
  const trimmed = String(fullName || '').trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function setIfEmpty(target, key, value, notes, sourceKey) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value) && value.length === 0) return;
  if (!Array.isArray(value) && String(value).trim() === '') return;
  if (hasNonEmptyValue(target, key)) return;
  target[key] = value;
  notes.push(`${sourceKey} → ${key}`);
}

/**
 * @param {Record<string, unknown>} data
 * @returns {{ data: Record<string, unknown>, migrated: boolean, notes: string[] }}
 */
function migrateLegacyKyciData(data) {
  const input = data && typeof data === 'object' ? { ...data } : {};
  const notes = [];

  if (!needsKyciDataMigration(input)) {
    return { data: input, migrated: false, notes };
  }

  const out = { ...input };

  if (hasNonEmptyValue(input, 'beneficiaryName')) {
    const { firstName, lastName } = splitBeneficiaryName(input.beneficiaryName);
    setIfEmpty(out, 'firstName', firstName, notes, 'beneficiaryName');
    setIfEmpty(out, 'lastName', lastName, notes, 'beneficiaryName');
  }

  const directKeys = [
    ['birthDate', 'birthDate'],
    ['birthPlace', 'birthPlace'],
    ['address', 'address'],
    ['country', 'country'],
    ['fundsSource', 'fundsSource'],
    ['fundsOther', 'fundsOther'],
  ];
  for (const [from, to] of directKeys) {
    setIfEmpty(out, to, input[from], notes, from);
  }

  setIfEmpty(out, 'employer', input.companyName, notes, 'companyName');
  setIfEmpty(out, 'occupation', input.activities, notes, 'activities');
  setIfEmpty(out, 'phone', input.custodyPhone, notes, 'custodyPhone');
  setIfEmpty(out, 'email', input.custodyEmail, notes, 'custodyEmail');

  if (hasNonEmptyValue(input, 'signerName')) {
    setIfEmpty(out, 'declarationName', input.signerName, notes, 'signerName');
  } else if (hasNonEmptyValue(input, 'custodyName')) {
    setIfEmpty(out, 'declarationName', input.custodyName, notes, 'custodyName');
  }

  if (hasNonEmptyValue(input, LEGACY_DATE_KEY)) {
    setIfEmpty(out, 'declarationDate', input[LEGACY_DATE_KEY], notes, LEGACY_DATE_KEY);
  }

  if (hasNonEmptyValue(input, 'companyName') && !hasNonEmptyValue(out, 'employer')) {
    notes.push('companyName: sin destino KYCI (employer ya ocupado o vacío ignorado)');
  }

  return { data: out, migrated: notes.length > 0, notes };
}

module.exports = {
  LEGACY_ONLY_KEYS,
  LEGACY_DATE_KEY,
  isKyciFormType,
  hasLegacyMarkers,
  hasKyciIdentity,
  needsKyciDataMigration,
  splitBeneficiaryName,
  migrateLegacyKyciData,
};
