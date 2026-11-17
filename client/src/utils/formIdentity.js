/**
 * Identificación de los trámites del usuario en "Trámites registrados":
 *  - nombre automático según el tipo de formulario (lo que el usuario llenó),
 *  - nombre personalizado opcional (__label),
 *  - código de referencia corto,
 *  - estado (borrador / completado).
 */
import { formKind, getFormProgress } from './formProgress';

const clean = (v) => (v === undefined || v === null ? '' : String(v).replace(/\s+/g, ' ').trim());
const firstOf = (...vals) => vals.map(clean).find(Boolean) || '';
const join = (...parts) => parts.map(clean).filter(Boolean).join(' · ');

/** Nombre automático: { primary, secondary } a partir de los datos del formulario. */
export function getAutoName(formType, data = {}) {
  const d = data || {};
  switch (formKind(formType)) {
    case 'kyci': {
      const person = firstOf([d.firstName, d.secondName, d.lastName].map(clean).filter(Boolean).join(' '), d.fullName);
      return { primary: person, secondary: clean(d.panamaEntityName) };
    }
    case 'kyce':
      return { primary: firstOf(d.legalName), secondary: clean(d.panamaEntityName) };
    case 'corporacion':
      return { primary: firstOf(d.corpNameSA, d.corpNameCorp, d.corpNameInc), secondary: '' };
    case 'fundacion':
      return { primary: firstOf(d.foundationNameOption1, d.foundationNameOption2, d.foundationNameOption3), secondary: '' };
    case 'fondos':
      return { primary: firstOf(d.companyName), secondary: clean(d.beneficiaryName) };
    default:
      // Otros formularios (asistente por plantilla): primer nombre reconocible.
      return {
        primary: firstOf(d.companyName, d.legalName, d.entityName, d.corpNameSA, d.foundationNameOption1, d.fullName, d.name),
        secondary: '',
      };
  }
}

/** Código corto y estable para reconocer el trámite (p. ej. al hablar con soporte). */
export function refCode(id) {
  const hex = String(id || '').replace(/[^a-f0-9]/gi, '').toUpperCase();
  return hex.length >= 8 ? `${hex.slice(0, 4)}-${hex.slice(4, 8)}` : String(id || '').toUpperCase();
}

/** Estado legible: { key: 'completed' | 'draft', label }. */
export function getFormStatus(formType, data = {}, lang = 'es') {
  const p = getFormProgress(formType, data, lang);
  const en = lang === 'en';
  if (p.finished === true) return { key: 'completed', label: en ? 'Completed' : 'Completado' };
  if (p.totalSteps && p.savedStep) {
    return { key: 'draft', label: en ? `Draft · step ${p.savedStep} of ${p.totalSteps}` : `Borrador · paso ${p.savedStep} de ${p.totalSteps}` };
  }
  return { key: 'draft', label: en ? 'Draft' : 'Borrador' };
}

/** Todo lo que el usuario ve de un trámite, más el texto en el que se busca. */
export function describeForm(doc, typeLabel, lang = 'es') {
  const data = (doc && doc.data) || {};
  const label = clean(data.__label);
  const auto = getAutoName(doc && doc.type, data);
  const autoText = join(auto.primary, auto.secondary);
  const ref = refCode(doc && (doc.parentId || doc.id));
  const status = getFormStatus(doc && doc.type, data, lang);
  const untitled = lang === 'en' ? 'Untitled yet' : 'Sin nombre aún';
  return {
    label,
    autoText,
    title: label || autoText || untitled,
    hasName: Boolean(label || autoText),
    ref,
    status,
    searchText: [typeLabel, doc && doc.type, label, autoText, ref, ref.replace('-', ''), status.label]
      .map((s) => clean(s).toLowerCase())
      .join(' | '),
  };
}

/** Coincidencia sin distinguir mayúsculas ni tildes. */
export function matchesSearch(searchText, term) {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = norm(term).trim();
  if (!q) return true;
  const hay = norm(searchText);
  return q.split(/\s+/).every((w) => hay.includes(w));
}
