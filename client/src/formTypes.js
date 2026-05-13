/**
 * Etiquetas visibles para los tipos de trámite.
 *
 * IMPORTANTE: las claves (`id` / `formType`) son contratos estables ya guardados
 * en BD y en `server/config/stablePdfForms.js`; **no se renombran**.
 * Aquí solo se controla el texto que ve el usuario.
 */

export const FORM_TYPE_LABELS = Object.freeze({
  'Fondos Registros contables': 'Declaración de Fondos',
  'Corporación': 'Incorporación',
  Fundaciones: 'Fundaciones',
  'Cumplimiento Individual': 'Cumplimiento Individual',
  'Cumplimiento Entidades': 'Cumplimiento Entidades',
});

/** Devuelve la etiqueta visible. Si no está mapeada, devuelve el propio `formType`. */
export function getFormTypeLabel(formType) {
  if (!formType) return '';
  return FORM_TYPE_LABELS[formType] || formType;
}
