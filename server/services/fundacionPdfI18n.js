'use strict';

const ES = Object.freeze({
  docTitle: 'Formulario de Fundación de Interés Privado',
  sectionName: 'Nombre de la Fundación',
  sectionNameHint: 'Listar los nombres que desea utilizar para su fundación en orden de preferencia.',
  choice1: '1ra Opción',
  choice2: '2da Opción',
  choice3: '3ra Opción',
  sectionCapital: 'Patrimonio Inicial',
  sectionCapitalHint: 'El patrimonio inicial mínimo es US$10,000.00.',
  capitalMin: 'Mínimo',
  capitalAuth: 'Declarado',
  sectionFounders: 'Fundadores',
  founderName: 'Nombre completo',
  founderBirthDate: 'Fecha de nacimiento',
  founderPassport: 'Pasaporte/Cédula',
  founderAddress: 'Dirección',
  sectionCouncil: 'Consejo de Fundación',
  councilPosition: 'Cargo',
  councilFullName: 'Nombre completo',
  councilBirthDate: 'Fecha de nacimiento',
  councilPassport: 'Pasaporte',
  sectionProtectors: 'Protectores',
  protectorName: 'Nombre completo',
  protectorPassport: 'Pasaporte/Cédula',
  sectionBeneficiaries: 'Beneficiarios',
  beneficiaryName: 'Nombre completo',
  beneficiaryPercentage: '% Beneficio',
  sectionActivities: 'Fines de la Fundación',
  sectionActivitiesHint: 'Favor provea una explicación de los objetivos y fines de la fundación.',
  sectionDeclaration: 'Declaración',
  sectionDeclarationHint: 'Declaro bajo juramento que la información proporcionada es verdadera y correcta.',
  declarationSignature: 'Firma',
  declarationName: 'Nombre',
  declarationDate: 'Fecha',
});

const EN = Object.freeze({
  docTitle: 'Private Interest Foundation Form',
  sectionName: 'Name of the Foundation',
  sectionNameHint: 'List the names you wish to use for your foundation in order of preference.',
  choice1: '1st Choice',
  choice2: '2nd Choice',
  choice3: '3rd Choice',
  sectionCapital: 'Initial Endowment',
  sectionCapitalHint: 'The minimum initial endowment is US$10,000.00.',
  capitalMin: 'Minimum',
  capitalAuth: 'Declared',
  sectionFounders: 'Founders',
  founderName: 'Full name',
  founderBirthDate: 'Date of birth',
  founderPassport: 'Passport/ID',
  founderAddress: 'Address',
  sectionCouncil: 'Foundation Council',
  councilPosition: 'Position',
  councilFullName: 'Full name',
  councilBirthDate: 'Date of birth',
  councilPassport: 'Passport',
  sectionProtectors: 'Protectors',
  protectorName: 'Full name',
  protectorPassport: 'Passport/ID',
  sectionBeneficiaries: 'Beneficiaries',
  beneficiaryName: 'Full name',
  beneficiaryPercentage: '% Benefit',
  sectionActivities: 'Foundation Objects',
  sectionActivitiesHint: 'Please provide an explanation of the foundation\'s objectives and purposes.',
  sectionDeclaration: 'Declaration',
  sectionDeclarationHint: 'I hereby affirm that information given on this application is complete and accurate.',
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

function getFundacionPdfDict(lang) {
  return DICTS[normalizeLanguage(lang)];
}

module.exports = {
  ES,
  EN,
  SUPPORTED_LANGS,
  normalizeLanguage,
  getFundacionPdfDict,
};
