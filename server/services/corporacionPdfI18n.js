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
  sectionName: 'Nombre de la compañía',
  sectionNameHint:
    'Listar los nombres que desea utilizar para incorporar su compañía en orden de preferencia:',
  sectionNameRule: 'El nombre de la Compañía debe terminar con una de las siguientes terminaciones: Corporation, Incorporated, Société Anonyme, Sociedad Anónima o con las abreviaciones: Corp., Inc. o S.A., A/S, N.V., B.V., AG.',
  choice1: '1ra Opción (S.A.)',
  choice2: '2da Opción (Corp.)',
  choice3: '3ra Opción (Inc.)',
  sectionCapital: 'Capital Social Autorizado',
  sectionCapitalHint: 'El capital mínimo autorizado de la sociedad será de US$10,000.00 divididos en 100 acciones con un valor nominal de US$100.00 cada una, las acciones emitidas de forma nominativa.',
  capitalMin: 'Mínimo',
  capitalAuth: 'Autorizado',
  sectionOfficers: 'Dignatarios',
  officerPosition: 'Cargo',
  officerFullName: 'Nombre completo',
  officerBirthDate: 'Fecha de nacimiento',
  officerPassport: 'Pasaporte',
  officerRegNumber: 'Número de Registro si es empresa',
  rolePresident: 'Presidente',
  roleSecretary: 'Secretario',
  roleTreasurer: 'Tesorero',
  sectionDirectors: 'Directores',
  sectionDirectorsHint: 'En PANAMÁ se require un mínimo de 3 diferentes directores.Pueden ser individuos o entidades legales de cualquier otra nacionalidad. Para incluir mas directores solicite otra pagina.',
  dirNum: '#',
  dirFullName: 'Nombres y Apellidos',
  dirFirstName: 'Nombre',
  dirMiddleName: 'Segundo',
  dirSurnames: 'Apellidos',
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
  shValue: 'Valor por acción',
  shCount: 'Cantidad de acciones',
  shName: 'Accionista',
  shAddress: 'Dirección',
  sectionActivities: 'Actividades de la Compañía',
  sectionActivitiesHint: 'Favor proveer una explicación de la actividad de la sociedad, como se realizará y en qué países se llevará a cabo.',
  sectionDeclaration: 'Declaración Jurada',
  sectionDeclarationHint:
    'Por la presente afirmo que la información dada en esta solicitud es completa y exacta. Entiendo que cualquier falsificación u omisión tendrá efectos y sanciones legales. Autorizo a la empresa a investigar la autenticidad de la información mencionada anteriormente.',
  declarationSignature: 'Firma',
  declarationName: 'Nombre',
  declarationDate: 'Fecha',
});

const EN = Object.freeze({
  docTitle: 'Incorporation Form',
  sectionName: 'Name of the corporation',
  sectionNameHint:
    'List the names you wish to use to incorporate your corporation in order of preference:',
  sectionNameRule: 'The name of the Company must be determined by one of the following terminations: Corporation, Incorporated, Société Anonyme, Sociedad Anónima, Corp., Inc., S.A., A / S, N.V., B.V., AG.',
  choice1: '1st Choice (S.A.)',
  choice2: '2nd Choice (Corp.)',
  choice3: '3rd Choice (Inc.)',
  sectionCapital: 'Authorized Capital',
  sectionCapitalHint: 'The minimum authorized capital of the company will be US$10,000.00 divided into 100 shares with a par value of US$100.00 each, the shares issued in nominative form.',
  capitalMin: 'Minimum',
  capitalAuth: 'Authorized',
  sectionOfficers: 'Officers',
  officerPosition: 'Position',
  officerFullName: 'Full name',
  officerBirthDate: 'Date of birth',
  officerPassport: 'Passport',
  officerRegNumber: 'Registration number (if company)',
  rolePresident: 'President',
  roleSecretary: 'Secretary',
  roleTreasurer: 'Treasurer',
  sectionDirectors: 'Directors',
  sectionDirectorsHint: 'In PANAMA a minimum of 3 different Directors are required. Could be Individuals or legal entities from any other nationality. To add more directors request another page.',
  dirNum: '#',
  dirFullName: 'First name, Middle name, Surname(s)',
  dirFirstName: 'First Name',
  dirMiddleName: 'Middle',
  dirSurnames: 'Surnames',
  dirBirthDate: 'Date of birth',
  dirMarital: 'Marital status',
  dirNationality: 'Citizenship',
  dirPassport: 'Passport',
  dirPhone: 'Phone',
  dirEmail: 'Email',
  dirAddress: 'Address',
  dirCity: 'City',
  dirCountry: 'Country',
  sectionShareholders: 'Shareholders',
  shNum: '#',
  shCertificate: 'Share certificate number',
  shValue: "Share's value",
  shCount: 'Number of shares',
  shName: 'Shareholder',
  shAddress: 'Address',
  sectionActivities: 'Company Activities',
  sectionActivitiesHint: "Please provide an explanation of the corporation's activities, how it will be carried out and in which countries it will be carried out.",
  sectionDeclaration: 'Declaration',
  sectionDeclarationHint:
    'I hereby affirm that information given on this application is complete and accurate. I understand that any falsification or ommission will carry legal effects and penalties. I authorize the company to investigate the authenticity of above-mentioned information.',
  declarationSignature: 'Signature',
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
