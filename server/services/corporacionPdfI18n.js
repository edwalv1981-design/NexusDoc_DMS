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
  docTitle: 'Formulario de Incorporación',
  sectionName: 'Nombre de la Compañía',
  sectionNameHint: 'Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia.',
  choice1: '1ra Opción (S.A.)',
  choice2: '2da Opción (Corp.)',
  choice3: '3ra Opción (Inc.)',
  sectionCapital: 'Capital Social Autorizado',
  sectionCapitalHint: 'El capital mínimo autorizado de la sociedad es US$10,000.00.',
  capitalMin: 'Mínimo',
  capitalAuth: 'Autorizado',
  sectionOfficers: 'Dignatarios',
  officerPosition: 'Cargo',
  officerFullName: 'Nombre completo',
  officerBirthDate: 'Fecha de nacimiento',
  officerPassport: 'Pasaporte',
  officerRegNumber: 'Número de registro',
  rolePresident: 'Presidente',
  roleSecretary: 'Secretario',
  roleTreasurer: 'Tesorero',
  sectionDirectors: 'Directores',
  sectionDirectorsHint: 'En Panamá se requieren mínimo 3 directores.',
  dirNum: '#',
  dirFullName: 'Nombre',
  dirBirthDate: 'Fecha de nacimiento',
  dirMarital: 'Estado civil',
  dirNationality: 'Nacionalidad',
  dirPassport: 'Pasaporte',
  dirPhone: 'Teléfono',
  dirEmail: 'Correo electrónico',
  dirAddress: 'Dirección',
  dirCity: 'Ciudad',
  dirCountry: 'País',
  sectionShareholders: 'Accionistas',
  shNum: '#',
  shCertificate: 'No. de certificado de acciones',
  shValue: 'Valor de la acción',
  shCount: 'Cantidad de acciones',
  shName: 'Accionista',
  shAddress: 'Dirección',
  sectionActivities: 'Actividades de la Compañía',
  sectionActivitiesHint: 'Favor provea una explicación de la actividad de la sociedad.',
  sectionDeclaration: 'Declaración',
  sectionDeclarationHint: 'Declaro bajo juramento que la información proporcionada es verdadera y correcta.',
  declarationName: 'Nombre',
  declarationDate: 'Fecha',
});

const EN = Object.freeze({
  docTitle: 'Incorporation Form',
  sectionName: 'Name of the Corporation',
  sectionNameHint: 'List the names you wish to use to incorporate your corporation in order of preference.',
  choice1: '1st Choice (S.A.)',
  choice2: '2nd Choice (Corp.)',
  choice3: '3rd Choice (Inc.)',
  sectionCapital: 'Authorized Capital',
  sectionCapitalHint: 'The minimum authorized capital of the company is US$10,000.00.',
  capitalMin: 'Minimum',
  capitalAuth: 'Authorized',
  sectionOfficers: 'Officers',
  officerPosition: 'Position',
  officerFullName: 'Full name',
  officerBirthDate: 'Date of birth',
  officerPassport: 'Passport',
  officerRegNumber: 'Registration number',
  rolePresident: 'President',
  roleSecretary: 'Secretary',
  roleTreasurer: 'Treasurer',
  sectionDirectors: 'Directors',
  sectionDirectorsHint: 'In Panama, a minimum of 3 directors are required.',
  dirNum: '#',
  dirFullName: 'Full name',
  dirBirthDate: 'Date of birth',
  dirMarital: 'Marital status',
  dirNationality: 'Nationality',
  dirPassport: 'Passport',
  dirPhone: 'Phone',
  dirEmail: 'Email',
  dirAddress: 'Address',
  dirCity: 'City',
  dirCountry: 'Country',
  sectionShareholders: 'Shareholders',
  shNum: '#',
  shCertificate: 'Share certificate number',
  shValue: 'Share value',
  shCount: 'Number of shares',
  shName: 'Shareholder',
  shAddress: 'Address',
  sectionActivities: 'Company Activities',
  sectionActivitiesHint: "Please provide an explanation of the corporation's activities.",
  sectionDeclaration: 'Declaration',
  sectionDeclarationHint: 'I hereby affirm that information given on this application is complete and accurate.',
  declarationName: 'Name',
  declarationDate: 'Date',
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
