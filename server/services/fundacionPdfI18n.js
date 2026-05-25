'use strict';

/**
 * Diccionario de textos del PDF de Fundación de Interés Privado.
 * Idioma según `user.language` (es | en). Sin etiquetas bilingües.
 */

const ES = Object.freeze({
  docTitle: 'Formulario de Fundación de Interés Privado',
  sectionName: 'Nombre de la Fundación',
  sectionNameHint:
    'Listar los nombres que desea utilizar para su fundación en orden de preferencia.',
  choice1: '1ra Opción',
  choice2: '2da Opción',
  choice3: '3ra Opción',
  sectionCapital: 'Patrimonio Inicial',
  sectionCapitalHint: 'El patrimonio inicial mínimo es US$10,000.00.',
  capitalMin: 'Mínimo',
  capitalAuth: 'Declarado',
  sectionFounder: 'Fundador',
  roleFounder: 'Fundador',
  roleProtector: 'Protector',
  roleDirector: 'Director',
  founderName: 'Nombre completo',
  founderBirthDate: 'Fecha de nacimiento',
  founderBirthPlace: 'Lugar de nacimiento',
  founderPassport: 'Pasaporte/Cédula',
  founderNationality: 'Nacionalidad',
  founderAddress: 'Dirección',
  sectionProtectors: 'Protectores',
  protectorName: 'Nombre completo',
  protectorBirthDate: 'Fecha de nacimiento',
  protectorPassport: 'Pasaporte/Cédula',
  protectorAddress: 'Dirección',
  sectionDirectors: 'Consejo de Fundación (Directores)',
  sectionDirectorsHint: 'Se requieren mínimo tres miembros del consejo.',
  dirNum: '#',
  dirFullName: 'Nombres y Apellidos',
  dirBirthDate: 'Fecha de nacimiento',
  dirMarital: 'Estado civil',
  dirNationality: 'Nacionalidad',
  dirPassport: 'Pasaporte',
  dirAddress: 'Dirección',
  dirCity: 'Ciudad',
  dirCountry: 'País',
  sectionDignitaries: 'Dignatarios',
  dignitaryRole: 'Cargo',
  dignitaryName: 'Nombre completo',
  dignitaryBirthDate: 'Fecha de nacimiento',
  dignitaryAddress: 'Dirección',
  sectionBeneficiaries: 'Beneficiarios',
  beneficiaryPercentage: '% Beneficio',
  beneficiaryShareholder: 'Accionista',
  beneficiaryBirthDate: 'Fecha de nacimiento',
  beneficiaryAddress: 'Dirección',
  sectionPowers: 'Poderes (Opcional)',
  poaHeaderGrantee:
    'Nombre, dirección del apoderado y forma en que ejercerá el poder (individual, conjunta, etc.)',
  poaSettingsHeader: 'Configuración de Poderes',
  poaTypeGeneral: 'GENERAL',
  poaTypeSpecial: 'ESPECIAL',
  poaFullName: 'Nombre completo',
  poaBirthDate: 'Fecha de nacimiento',
  poaMaritalStatus: 'Estado civil',
  poaNationality: 'Nacionalidad',
  poaPassport: 'Pasaporte',
  poaIdCard: 'Cédula',
  poaPhone: 'Teléfono',
  poaEmail: 'Correo electrónico',
  poaAddress: 'Dirección',
  poaCity: 'Ciudad',
  poaCountry: 'País',
  poaIssueQuestion: '¿Desea emitir un poder?',
  poaTypeQuestion: 'Si la respuesta es sí, seleccione el tipo de poder',
  poaValidityQuestion: 'Fecha de vigencia',
  poaLegalizedQuestion: '¿Requiere que el poder sea legalizado?',
  yes: 'Sí',
  no: 'No',
  sectionActivities: 'Fines de la Fundación',
  sectionActivitiesHint: 'Favor provea una explicación de los objetivos y fines de la fundación.',
  sectionDeclaration: 'Declaración',
  sectionDeclarationHint:
    'Declaro bajo juramento que la información proporcionada es verdadera y correcta.',
  declarationSignature: 'Firma',
  declarationName: 'Nombre',
  declarationDate: 'Fecha',
  emptyFounder: 'Sin fundador declarado',
  emptyProtectors: 'Sin protectores declarados',
  emptyDirectors: 'Sin directores declarados',
  emptyDignitaries: 'Sin dignatarios declarados',
  emptyBeneficiaries: 'Sin beneficiarios declarados',
});

const EN = Object.freeze({
  docTitle: 'Private Interest Foundation Form',
  sectionName: 'Name of the Foundation',
  sectionNameHint:
    'List the names you wish to use for your foundation in order of preference.',
  choice1: '1st Choice',
  choice2: '2nd Choice',
  choice3: '3rd Choice',
  sectionCapital: 'Initial Endowment',
  sectionCapitalHint: 'The minimum initial endowment is US$10,000.00.',
  capitalMin: 'Minimum',
  capitalAuth: 'Declared',
  sectionFounder: 'Founder',
  roleFounder: 'Founder',
  roleProtector: 'Protector',
  roleDirector: 'Director',
  founderName: 'Full name',
  founderBirthDate: 'Date of birth',
  founderBirthPlace: 'Place of birth',
  founderPassport: 'Passport/ID',
  founderNationality: 'Citizenship',
  founderAddress: 'Address',
  sectionProtectors: 'Protectors',
  protectorName: 'Full name',
  protectorBirthDate: 'Date of birth',
  protectorPassport: 'Passport/ID',
  protectorAddress: 'Address',
  sectionDirectors: 'Foundation Council (Directors)',
  sectionDirectorsHint: 'A minimum of three council members is required.',
  dirNum: '#',
  dirFullName: 'First name, Middle name, Surname(s)',
  dirBirthDate: 'Date of birth',
  dirMarital: 'Marital status',
  dirNationality: 'Citizenship',
  dirPassport: 'Passport',
  dirAddress: 'Address',
  dirCity: 'City',
  dirCountry: 'Country',
  sectionDignitaries: 'Dignitaries',
  dignitaryRole: 'Position',
  dignitaryName: 'Full name',
  dignitaryBirthDate: 'Date of birth',
  dignitaryAddress: 'Address',
  sectionBeneficiaries: 'Beneficiaries',
  beneficiaryPercentage: '% Benefit',
  beneficiaryShareholder: 'Shareholder',
  beneficiaryBirthDate: 'Date of birth',
  beneficiaryAddress: 'Address',
  sectionPowers: 'Power of Attorney (Optional)',
  poaHeaderGrantee:
    'Name, address of the attorney-in-fact and manner of acting (individual, jointly, etc.)',
  poaSettingsHeader: 'Power of Attorney Settings',
  poaTypeGeneral: 'GENERAL',
  poaTypeSpecial: 'SPECIAL',
  poaFullName: 'Full name',
  poaBirthDate: 'Date of birth',
  poaMaritalStatus: 'Marital status',
  poaNationality: 'Citizenship',
  poaPassport: 'Passport',
  poaIdCard: 'ID',
  poaPhone: 'Phone',
  poaEmail: 'Email',
  poaAddress: 'Address',
  poaCity: 'City',
  poaCountry: 'Country',
  poaIssueQuestion: 'Would you like to issue a power of attorney?',
  poaTypeQuestion: 'If yes, please select the type of power of attorney',
  poaValidityQuestion: 'Validity date',
  poaLegalizedQuestion: 'Would you require the power of attorney to be legalized?',
  yes: 'Yes',
  no: 'No',
  sectionActivities: 'Foundation Objects',
  sectionActivitiesHint: "Please provide an explanation of the foundation's objectives and purposes.",
  sectionDeclaration: 'Declaration',
  sectionDeclarationHint:
    'I hereby affirm that the information provided on this application is complete and accurate.',
  declarationSignature: 'Signature',
  declarationName: 'Name',
  declarationDate: 'Date',
  emptyFounder: 'No founder declared',
  emptyProtectors: 'No protectors declared',
  emptyDirectors: 'No directors declared',
  emptyDignitaries: 'No dignitaries declared',
  emptyBeneficiaries: 'No beneficiaries declared',
});

const DICTS = { es: ES, en: EN };
const SUPPORTED_LANGS = Object.freeze(['es', 'en']);

function normalizeLanguage(lang) {
  if (!lang) return 'es';
  const lower = String(lang).toLowerCase().slice(0, 2);
  return SUPPORTED_LANGS.includes(lower) ? lower : 'es';
}

function getFundacionPdfDict(lang) {
  return DICTS[normalizeLanguage(lang)];
}

function assertFundacionPdfI18nParity() {
  const esKeys = Object.keys(ES).sort();
  const enKeys = Object.keys(EN).sort();
  if (esKeys.length !== enKeys.length || esKeys.some((k, i) => k !== enKeys[i])) {
    const missingInEn = esKeys.filter((k) => !enKeys.includes(k));
    const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
    throw new Error(
      `fundacionPdfI18n: diccionarios desalineados. Faltan en EN: [${missingInEn.join(',')}], faltan en ES: [${missingInEs.join(',')}]`
    );
  }
}

module.exports = {
  ES,
  EN,
  SUPPORTED_LANGS,
  normalizeLanguage,
  getFundacionPdfDict,
  assertFundacionPdfI18nParity,
};
