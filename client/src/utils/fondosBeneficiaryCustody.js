/**
 * Copia silenciosa beneficiario final → custodio (solo campos que existen en ambos pasos).
 * Nunca inventa datos: solo valores ya capturados en el formulario.
 */
export const FONDOS_BENEFICIARY_TO_CUSTODY = [
  { from: 'beneficiaryName', to: 'custodyName' },
  { from: 'address', to: 'custodyAddress' },
];

export const CUSTODY_PREFILL_TARGETS = FONDOS_BENEFICIARY_TO_CUSTODY.map((m) => m.to);

export function hasValue(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

export function pickBeneficiaryForCustody(data = {}) {
  const out = {};
  for (const { from, to } of FONDOS_BENEFICIARY_TO_CUSTODY) {
    if (hasValue(data[from])) out[to] = String(data[from]).trim();
  }
  return out;
}

export function mergeBeneficiaryIntoCustody(formData, opts = {}) {
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
