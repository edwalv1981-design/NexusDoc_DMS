'use strict';

/**
 * Textos del PDF KYCI según la plantilla oficial
 * "PTL_KYC – Compliance Form – Individuals".
 *  - EN: texto literal de la plantilla.
 *  - ES: traducción fiel, misma estructura y orden.
 * El idioma lo decide quien solicita el PDF (no el idioma en que se llenó).
 */

const kyciMaster = require('../../lib/kyciMasterSpec.cjs');

const EN = Object.freeze({
  lang: 'en',
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
  roleLabel: 'en',
  yes: 'Yes',
  no: 'No',
});

const ES = Object.freeze({
  lang: 'es',
  docTitle: 'FORMULARIO DE CUMPLIMIENTO\nPERSONAS NATURALES',
  docSubtitle: 'Procedimiento de Debida Diligencia del Cliente',
  panamaEntityName: 'Nombre o nombre propuesto de la entidad panameña:',
  introTitle: 'Este formulario debe ser completado por cada persona (el “Solicitante”) que:',
  introItems: Object.freeze([
    ['posee o propone poseer, directa o indirectamente, el 10% o más del capital social de la Sociedad', 'Accionista'],
    ['es Beneficiario Final de la entidad panameña (o de la entidad panameña propuesta)', 'Beneficiario Final'],
    ['es uno de los directores extranjeros de la sociedad', 'Director'],
    ['es el socio general de una sociedad de personas', 'Socio General'],
    ['es firmante autorizado de la cuenta bancaria', 'Firmante Autorizado'],
    ['es titular de un poder', 'Apoderado'],
    ['es fundador/fideicomitente de una Fundación/fideicomiso', 'Fideicomitente'],
    ['es ejecutor de un fideicomiso', 'Ejecutor'],
    ['es protector de una Fundación/fideicomiso', 'Protector'],
  ]),
  introNote:
    'Tenga en cuenta que se nos debe enviar una copia original del Formulario de Cumplimiento firmado junto con los documentos de debida diligencia.',
  applicantRolesTitle: 'El Solicitante es uno o más de los siguientes:',
  fullNameLabel: 'Nombre completo del Solicitante',
  firstName: 'Primer nombre',
  secondName: 'Segundo nombre',
  lastName: 'Apellido(s)',
  birthDate: 'Fecha de nacimiento',
  datePlaceholder: '[dd/mm/aaaa]',
  nationality: 'Nacionalidad(es)',
  birthPlace: 'Lugar de nacimiento',
  passport: 'Pasaporte No.',
  address: 'Dirección residencial permanente',
  maritalStatus: 'Estado civil',
  phone: 'Teléfono (incluya código de área)',
  email: 'Correo electrónico',
  taxResidenceCountries: '¿En qué país(es) es usted residente para fines tributarios?',
  otherTaxResidence: '¿Es usted residente o está domiciliado en algún otro país?',
  otherTaxResidenceDetails: 'En caso afirmativo, proporcione detalles:',
  taxNote: 'Nota: Por favor complete la Declaración Tributaria de Autocertificación Individual (si aplica)',
  fatcaLabel: 'Ley de Cumplimiento Tributario de Cuentas Extranjeras (FATCA) – Estatus y vínculos con EE. UU.',
  usPerson: '¿Es usted una Persona de EE. UU. o residente en EE. UU. para fines tributarios? (p. ej. titular de Green Card)',
  usAffirmative:
    'En caso afirmativo, por favor complete un formulario W9 e indique el número de identificación tributaria correspondiente ‘TIN’:',
  usTin: 'TIN:',
  usDetails: 'Detalles:',
  sourceOfWealthLabel: 'Origen del patrimonio',
  sourceOfWealth:
    'Proporcione detalles sobre el origen del patrimonio (p. ej. salarios, propiedad de negocios, etc.), incluyendo detalles del empleo y/o nombres y actividades de los negocios.',
  pepLabel: 'Vínculos políticos',
  pep: '¿Usted o algún miembro de su familia inmediata ocupa u ocupó un cargo de “Persona Expuesta Políticamente” (PEP)? p. ej. político, alto funcionario de gobierno o militar, etc.',
  pepDetails: 'Por favor proporcione detalles, incluyendo cargo, responsabilidad y períodos.',
  offencesLabel: 'Delitos/Sanciones',
  offenceConvicted:
    '¿Ha sido usted condenado en algún momento por algún delito penal o ha sido objeto de sanciones por parte de un organismo judicial, gubernamental, profesional o regulador?',
  offenceBankrupt: '¿Está o ha estado usted en quiebra no rehabilitada?',
  offenceInvestigation: '¿Ha sido usted objeto de una investigación judicial u oficial?',
  offenceDetails: 'En caso afirmativo, por favor proporcione detalles:',
  docsTitle: 'DOCUMENTOS DE IDENTIDAD CERTIFICADOS QUE DEBEN ADJUNTARSE',
  docsIntroBefore: 'Adjunto copias ',
  docsIntroBold: 'certificadas',
  docsIntroAfter: ' de los siguientes documentos:',
  docsFooter:
    'Estos documentos deben estar certificados como copias fieles y exactas de los documentos originales por un profesional independiente (ver las Notas a continuación sobre la certificación adecuada).',
  declaration:
    'Por la presente confirmo que los datos anteriores son verdaderos y exactos, y me comprometo a informarles en caso de que alguna de mis circunstancias cambie, dentro de los 14 días siguientes a dicho cambio.',
  signature: 'Firma del Solicitante:',
  declarationDate: 'Fecha (dd/mm/aaaa):',
  notesTitle: 'NOTAS',
  notes: kyciMaster.NOTES_ES,
  roleLabel: 'es',
  yes: 'Sí',
  no: 'No',
});

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
