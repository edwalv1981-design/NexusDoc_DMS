'use strict';

/**
 * Textos del PDF KYCI. Reproducen literalmente la plantilla oficial
 * "PTL_KYC – Compliance Form – Individuals" (redactada en inglés), por eso
 * el PDF sale con el mismo texto sea cual sea el idioma de la interfaz.
 * Se conservan ES/EN y getKyciPdfDict para no cambiar la API del módulo.
 */

const kyciMaster = require('../../lib/kyciMasterSpec.cjs');

const TEMPLATE = Object.freeze({
  docTitle: 'COMPLIANCE FORM\nINDIVIDUALS',
  docSubtitle: 'Customer Due Diligence Procedure',
  panamaEntityName: 'Name/proposed name of the Panama entity:',
  introTitle: 'This form is for completion by each individual (the “Applicant”) who:',
  introItems: Object.freeze([
    ['owns or proposes owning, directly or indirectly, 10% or greater of the share capital of the Company', 'Shareholder'],
    ['is a Beneficial Owner of the Panama entity (or proposed Panama Entity)', 'Beneficial Owner'],
    ['is one of the foreign directors of the company', 'Director'],
    ['is the general partner of a partnership', 'General Partner'],
    ['is an authorised signatory to the bank account', 'Authorised Signatory'],
    ['is a holder of a power of attorney', 'Power of Attorney'],
    ['is a founder/Settlor of a Foundation/trust', 'Settlor'],
    ['is an enforcer of a trust', 'Enforcer'],
    ['Is a protector of a Foundation/trust', 'Protector'],
  ]),
  introNote:
    'Note that an original copy of the executed Compliance Form must be sent to us together with the due diligence documents.',
  applicantRolesTitle: 'Applicant is one or more of the following:',
  fullNameLabel: 'Full Name of Applicant',
  firstName: 'First Name',
  secondName: 'Middle Name',
  lastName: 'Surname(s)',
  birthDate: 'Date of Birth',
  datePlaceholder: '[dd/mm/yyyy]',
  nationality: 'Nationality(ies)',
  birthPlace: 'Place of Birth',
  passport: 'Passport No',
  address: 'Permanent Residential Address',
  maritalStatus: 'Marital Status',
  phone: 'Telephone (include area code)',
  email: 'E-mail address',
  taxResidenceCountries: 'In which country(ies) are you resident for tax purposes?',
  otherTaxResidence: 'Are you resident or domiciled in any other country?',
  otherTaxResidenceDetails: 'If yes, provide details:',
  taxNote: 'Note: Please complete the Individual Self Certification Tax Declaration (If applicable)',
  fatcaLabel: 'Foreign Account Tax Compliance Act – U.S Status and Connections',
  usPerson: 'Are you a U.S. Person or resident in the U.S. for tax purposes? (e.g. Green Card holder)',
  usAffirmative:
    'In the affirmative, please complete a W9 and provide the relevant tax identification number ‘TIN’:',
  usTin: 'TIN:',
  usDetails: 'Details:',
  sourceOfWealthLabel: 'Source of Wealth',
  sourceOfWealth:
    'Provide details regarding source of wealth (e.g. salaries, ownership of business etc)) including details of employment and/or business names and activities.',
  pepLabel: 'Political Connections',
  pep: 'Do you or any member of your immediate family hold or previously held a position of a “Politically Exposed Person” (PEP) e.g. Politician, Senior Government or Military Official etc',
  pepDetails: 'Please provide details including position, responsibility and time frames.',
  offencesLabel: 'Offences/Sanctions',
  offenceConvicted:
    'Have you at any time been convicted of any criminal offence or been subject to sanctions by a Judicial, Government, Professional or Regulatory body?',
  offenceBankrupt: 'Are you or have you been an un-discharged bankruptcy?',
  offenceInvestigation: 'Have you been the subject of a judicial or official enquiry/investigation?',
  offenceDetails: 'If so, please provide details:',
  docsTitle: 'CERTIFIED IDENTITY DOCUMENTS TO BE ATTACHED',
  docsIntroBefore: 'I hereby attach ',
  docsIntroBold: 'certified',
  docsIntroAfter: ' copies of the following documents:',
  docsFooter:
    'These documents must be certified as true and correct copies of the original documents by a third party professional (see Notes below for appropriate certification).',
  declaration:
    'I hereby confirm that the above details are true and accurate and I undertake to advise you in the event that any of my circumstances change within 14 days of those changes occurring.',
  signature: 'Signature of Applicant:',
  declarationDate: 'Date (dd/mm/yyyy):',
  notesTitle: 'NOTES',
  notes: kyciMaster.NOTES_EN,
  yes: 'Yes',
  no: 'No',
});

const ES = TEMPLATE;
const EN = TEMPLATE;

function normalizeLanguage(lang) {
  const s = String(lang || 'es').toLowerCase();
  return s.startsWith('en') ? 'en' : 'es';
}

function getKyciPdfDict(lang) {
  return normalizeLanguage(lang) === 'en' ? EN : ES;
}

function assertKyciPdfI18nParity() {
  const esKeys = Object.keys(ES).sort();
  const enKeys = Object.keys(EN).sort();
  if (esKeys.length !== enKeys.length || esKeys.some((k, i) => k !== enKeys[i])) {
    throw new Error('kyciPdfI18n: diccionarios desalineados');
  }
}

module.exports = {
  ES,
  EN,
  normalizeLanguage,
  getKyciPdfDict,
  assertKyciPdfI18nParity,
};
