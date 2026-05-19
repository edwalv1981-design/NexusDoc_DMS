'use strict';

/**
 * Copia silenciosa beneficiario final → custodio (solo campos que existen en ambos pasos).
 * Nunca inventa datos: solo valores ya capturados en el formulario.
 */
const FONDOS_BENEFICIARY_TO_CUSTODY = [
  { from: 'beneficiaryName', to: 'custodyName' },
  { from: 'address', to: 'custodyAddress' },
];

const CUSTODY_PREFILL_TARGETS = FONDOS_BENEFICIARY_TO_CUSTODY.map((m) => m.to);

function hasValue(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

function pickBeneficiaryForCustody(data = {}) {
  const out = {};
  for (const { from, to } of FONDOS_BENEFICIARY_TO_CUSTODY) {
    if (hasValue(data[from])) out[to] = String(data[from]).trim();
  }
  return out;
}

/**
 * @param {Record<string, unknown>} formData
 * @param {{ touched?: Record<string, boolean>, onlyEmpty?: boolean }} [opts]
 * @returns {Record<string, unknown>}
 */
function mergeBeneficiaryIntoCustody(formData, opts = {}) {
  const { touched = {}, onlyEmpty = false } = opts;
  const source = pickBeneficiaryForCustody(formData);
  const next = { ...formData };
  let changed = false;

  for (const [to, value] of Object.entries(source)) {
    if (touched[to]) continue;
    if (onlyEmpty && hasValue(formData[to])) continue;
    if (formData[to] === value) continue;
    next[to] = value;
    changed = true;
  }

  return changed ? next : formData;
}

module.exports = {
  FONDOS_BENEFICIARY_TO_CUSTODY,
  CUSTODY_PREFILL_TARGETS,
  hasValue,
  pickBeneficiaryForCustody,
  mergeBeneficiaryIntoCustody,
};
