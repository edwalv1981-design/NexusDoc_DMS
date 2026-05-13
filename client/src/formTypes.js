import esDict from './i18n/locales/es';
import enDict from './i18n/locales/en';

/**
 * Etiquetas visibles para los tipos de trámite.
 *
 * IMPORTANTE: las claves (`id` / `formType`) son contratos estables ya guardados
 * en BD y en `server/config/stablePdfForms.js`; **no se renombran**.
 * Aquí solo se controla el texto que ve el usuario, en el idioma activo.
 */

const DICTS = { es: esDict.formType, en: enDict.formType };

export const FORM_TYPE_LABELS = DICTS.es;

/**
 * Devuelve la etiqueta visible para el tipo de trámite.
 * @param {string} formType  Clave estable (igual a la BD).
 * @param {string} [lang]    Idioma activo ('es' | 'en'). Default 'es'.
 */
export function getFormTypeLabel(formType, lang = 'es') {
  if (!formType) return '';
  const dict = DICTS[lang] || DICTS.es;
  return dict[formType] || (DICTS.es[formType] || formType);
}
