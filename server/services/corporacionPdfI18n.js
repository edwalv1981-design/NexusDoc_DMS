'use strict';

/**
 * Diccionario de textos del PDF de Incorporación / Corporación.
 *
 * El idioma se decide a partir de `user.language` (columna BD).
 * - 'es' → todo el documento en español.
 * - 'en' → todo el documento en inglés.
 *
 * Declaración de Fondos es bilingüe en su propio template y NO usa este diccionario.
 */

const ES = Object.freeze({
  docTitle: 'Incorporation Form / Formulario de Incorporación',
  sectionName: 'Name of the corporation / Nombre de la compañía',
  sectionNameHint: 'List the names you wish to use to incorporate your corporation in order of preference / Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia',
  choice1: '1st choice',
  choice2: '2nd choice',
  choice3: '3rd choice',
  sectionCapital: 'Authorized Capital / Capital Social Autorizado:',
  sectionCapitalHint: 'The minimum authorized capital of the company is US$10,000.00 / El capital mínimo de la sociedad es US$10,000.00',
  capitalMin: 'Minimum / Mínimo',
  capitalAuth: 'Authorized / Autorizado',
  sectionOfficers: 'Officers / dignatarios',
  officerPosition: 'Position / Cargo',
  officerFullName: 'Full name / Nombre completo',
  officerBirthDate: 'Date of birth / Fecha de nacimiento',
  officerPassport: 'Passport / Pasaporte',
  officerRegNumber: 'Registration number (if company) / Número de Registro si es empresa',
  rolePresident: 'Presidente',
  roleSecretary: 'Secretario',
  roleTreasurer: 'Tesorero',
  sectionDirectors: 'Directors / directores',
  sectionDirectorsHint: 'In Panama, a minimum of 3 directors are required / En Panamá se requieren mínimo 3 directores',
  dirNum: '#',
  dirFullName: 'First name, Middle name, Surname(s) / Nombres y Apellidos',
  dirBirthDate: 'Date of birth / Fecha de nacimiento',
  dirMarital: 'Marital status / Estado civil',
  dirNationality: 'Citizenship / Nacionalidad',
  dirPassport: 'Passport / Pasaporte',
  dirPhone: 'Phone / Teléfono',
  dirEmail: 'Email',
  dirAddress: 'Address / Dirección',
  dirCity: 'City / Ciudad',
  dirCountry: 'Country / País',
  sectionShareholders: 'Shareholders / Accionistas',
  shNum: '#',
  shCertificate: 'Share certificate number / No. de certificado de acciones',
  shValue: 'Share\'s value / valor por acción',
  shCount: 'Number of shares / Cantidad de acciones',
  shName: 'Shareholder / Accionista',
  shAddress: 'Address / dirección',
  sectionActivities: 'Company Activities / Actividades de la Compañía',
  sectionActivitiesHint: 'Please provide an explanation of the corporation\'s activities / Favor provea una explicación de la actividad de la sociedad',
  sectionDeclaration: 'Declaration / Declaración Jurada',
  sectionDeclarationHint: 'I/We declare that the origin of funds and goods linked to the services provided by Panama Tax Lawyers and its associates derive from legitimate sources and without criminal origin / Declaro que el origen de los fondos y bienes vinculados a los servicios prestados por Panama Tax Lawyers y sus asociados derivan de fuentes legítimas y sin origen delictivo',
  declarationSignature: 'Signature / Firma',
  declarationName: 'Name / Nombre',
  declarationDate: 'Date / Fecha',
});

const EN = Object.freeze({
  docTitle: 'Incorporation Form / Formulario de Incorporación',
  sectionName: 'Name of the corporation / Nombre de la compañía',
  sectionNameHint: 'List the names you wish to use to incorporate your corporation in order of preference / Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia',
  choice1: '1st choice',
  choice2: '2nd choice',
  choice3: '3rd choice',
  sectionCapital: 'Authorized Capital / Capital Social Autorizado:',
  sectionCapitalHint: 'The minimum authorized capital of the company is US$10,000.00 / El capital mínimo de la sociedad es US$10,000.00',
  capitalMin: 'Minimum / Mínimo',
  capitalAuth: 'Authorized / Autorizado',
  sectionOfficers: 'Officers / dignatarios',
  officerPosition: 'Position / Cargo',
  officerFullName: 'Full name / Nombre completo',
  officerBirthDate: 'Date of birth / Fecha de nacimiento',
  officerPassport: 'Passport / Pasaporte',
  officerRegNumber: 'Registration number (if company) / Número de Registro si es empresa',
  rolePresident: 'Presidente',
  roleSecretary: 'Secretario',
  roleTreasurer: 'Tesorero',
  sectionDirectors: 'Directors / directores',
  sectionDirectorsHint: 'In Panama, a minimum of 3 directors are required / En Panamá se requieren mínimo 3 directores',
  dirNum: '#',
  dirFullName: 'First name, Middle name, Surname(s) / Nombres y Apellidos',
  dirBirthDate: 'Date of birth / Fecha de nacimiento',
  dirMarital: 'Marital status / Estado civil',
  dirNationality: 'Citizenship / Nacionalidad',
  dirPassport: 'Passport / Pasaporte',
  dirPhone: 'Phone / Teléfono',
  dirEmail: 'Email',
  dirAddress: 'Address / Dirección',
  dirCity: 'City / Ciudad',
  dirCountry: 'Country / País',
  sectionShareholders: 'Shareholders / Accionistas',
  shNum: '#',
  shCertificate: 'Share certificate number / No. de certificado de acciones',
  shValue: 'Share\'s value / valor por acción',
  shCount: 'Number of shares / Cantidad de acciones',
  shName: 'Shareholder / Accionista',
  shAddress: 'Address / dirección',
  sectionActivities: 'Company Activities / Actividades de la Compañía',
  sectionActivitiesHint: 'Please provide an explanation of the corporation\'s activities / Favor provea una explicación de la actividad de la sociedad',
  sectionDeclaration: 'Declaration / Declaración Jurada',
  sectionDeclarationHint: 'I/We declare that the origin of funds and goods linked to the services provided by Panama Tax Lawyers and its associates derive from legitimate sources and without criminal origin / Declaro que el origen de los fondos y bienes vinculados a los servicios prestados por Panama Tax Lawyers y sus asociados derivan de fuentes legítimas y sin origen delictivo',
  declarationSignature: 'Signature / Firma',
  declarationName: 'Name / Nombre',
  declarationDate: 'Date / Fecha',
});


const DICTS = { es: ES, en: EN };
const SUPPORTED_LANGS = Object.freeze(['es', 'en']);

function normalizeLanguage(lang) {
  if (!lang) return 'es';
  const lower = String(lang).toLowerCase().slice(0, 2);
  return SUPPORTED_LANGS.includes(lower) ? lower : 'es';
}

function getCorporacionPdfDict(lang) {
  return DICTS[normalizeLanguage(lang)];
}

/** Lanza si las claves de ES y EN difieren. Usado por tests / assert de arranque. */
function assertCorporacionPdfI18nParity() {
  const esKeys = Object.keys(ES).sort();
  const enKeys = Object.keys(EN).sort();
  if (esKeys.length !== enKeys.length || esKeys.some((k, i) => k !== enKeys[i])) {
    const missingInEn = esKeys.filter((k) => !enKeys.includes(k));
    const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
    throw new Error(
      `corporacionPdfI18n: diccionarios desalineados. Faltan en EN: [${missingInEn.join(',')}], faltan en ES: [${missingInEs.join(',')}]`
    );
  }
}

module.exports = {
  ES,
  EN,
  SUPPORTED_LANGS,
  normalizeLanguage,
  getCorporacionPdfDict,
  assertCorporacionPdfI18nParity,
};
