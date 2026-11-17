'use strict';

/**
 * Textos del PDF KYCE según la plantilla oficial
 * "PTL_KYC – Compliance Form – Companies/Trusts/Partnerships".
 *  - EN: texto literal de la plantilla.
 *  - ES: traducción fiel, misma estructura y orden.
 * El idioma lo decide quien solicita el PDF.
 */

const kyceMaster = require('../../lib/kyceMasterSpec.cjs');

const EN = Object.freeze({
  lang: 'en',
  docTitle: 'COMPLIANCE FORM\nCOMPANIES/TRUSTS/PARTNERSHIPS',
  docSubtitle: 'Know Your Client Procedure',
  panamaEntityName: 'Name/proposed name of Panama entity (Company/ Foundation):',
  intro:
    'This form is for completion, in respect of the Company, by each company, trust or partnership which owns or proposes owning, directly or indirectly 10% or greater of the share capital of the Company; that is a Corporate Director of the Company, or is a holder of a Power of Attorney (together, referred to as “Applicant”).',
  introNote:
    'Note that an original copy of the executed Compliance Form must be sent together with the required due diligence documents.',
  legalName: 'Registered Name of Applicant',
  incorporationDate: 'Date of Incorporation / Formation',
  datePlaceholder: '[dd/mm/yyyy]',
  jurisdiction: 'Jurisdiction of Incorporation/Formation',
  registrationNumber: 'Incorporation /Formation Number',
  registeredAddress: 'Registered Office Address',
  mailingAddress: 'Mailing Address',
  phone: 'Telephone (including area code)',
  businessActivity: 'Description of Business',
  offencesLabel: 'Offences and Sanctions',
  offenceConvicted:
    'Has the Applicant at any time been convicted of any criminal offence or been subject to sanctions by a Judicial, Government, Professional or Regulatory body?',
  offenceInvestigation: 'Has the Applicant at any time been the subject of a judicial enquiry/investigation?',
  offenceDetails: 'If so, please provide details:',
  applicantIsA: 'If Applicant is a:',
  stockExchange: 'Full name of stock exchange listing',
  tickerSymbol: 'Ticker Symbol',
  regulatedParentName: 'If Applicant is a Subsidiary of a Regulated Entity, name of Regulated Entity:',
  regulatorName: 'Name of Regulator',
  country: 'Country',
  governmentEntityType: 'Type of Govt. Entity',
  pleaseAttach: 'Please attach',
  privateNote:
    'Compliance Forms and KYC Documents must be submitted for at least 2 controlling Directors and all Shareholders and Ultimate Beneficial Owners holding 10% or greater of the total issued ordinary shares of the Private Company.',
  beneficiaries: 'Beneficiary / ies',
  settlorNameAddress: 'Name and address of Settlor',
  trusteesNameAddress: 'Name and address of Trustee/s',
  enforcerNameAddress: 'Name and address of Enforcer',
  protectorNameAddress: 'Name and address of Protector',
  beneficiary: 'Name/ number and address of Beneficiary',
  trustNote: 'Compliance Forms and KYC Documents must be submitted for all parties listed above.',
  partnershipNote:
    'Compliance Forms and KYC Documents must be submitted for the General Partner and all Limited/Other Partners with a 10% or greater interest in the contributed capital.',
  noteLabel: 'Note',
  fatcaLabel: 'FATCA/CRS Classification',
  fatcaGiin: 'If so, please list the GIIN #',
  fatcaSponsorGiin: 'If so, please list the Sponsors GIIN #',
  fatcaExemptReason: 'If so, please list the Reason/type',
  taxResidencyLabel: 'Tax Residency',
  usEntity:
    'Is the Entity a US Entity, resident in the US for tax purposes, or has elected to be treated as a US Entity for tax purposes?',
  einPrompt: 'If so, please provide the EI identification number',
  einNumber: 'EI No:',
  otherTaxResidence: 'Is the Entity resident in or domiciled in any other country?',
  otherTaxResidenceDetails: 'If yes, provide details:',
  taxIdNumber: 'Tax Identification No:',
  selfCertNote: 'Please complete and submit the Entity Self Certification Declaration Form',
  declaration:
    'I hereby confirm that the above details are true and accurate and I undertake to advise you in the event that any of the circumstances change within 14 days of those changes occurring.',
  signature: 'Legal representative or authorised signatory',
  declarationDate: 'Date (dd/mm/yyyy)',
  notesTitle: 'NOTES',
  notes: kyceMaster.NOTES_EN,
  yes: 'Yes',
  no: 'No',
});

const ES = Object.freeze({
  lang: 'es',
  docTitle: 'FORMULARIO DE CUMPLIMIENTO\nSOCIEDADES/FIDEICOMISOS/SOCIEDADES DE PERSONAS',
  docSubtitle: 'Procedimiento Conozca a su Cliente',
  panamaEntityName: 'Nombre o nombre propuesto de la entidad panameña (Sociedad/ Fundación):',
  intro:
    'Este formulario debe ser completado, respecto de la Sociedad, por cada sociedad, fideicomiso o sociedad de personas que posea o proponga poseer, directa o indirectamente, el 10% o más del capital social de la Sociedad; que sea Director Corporativo de la Sociedad, o que sea titular de un Poder (en conjunto, denominados el “Solicitante”).',
  introNote:
    'Tenga en cuenta que se debe enviar una copia original del Formulario de Cumplimiento firmado junto con los documentos de debida diligencia requeridos.',
  legalName: 'Nombre registrado del Solicitante',
  incorporationDate: 'Fecha de incorporación / constitución',
  datePlaceholder: '[dd/mm/aaaa]',
  jurisdiction: 'Jurisdicción de incorporación/constitución',
  registrationNumber: 'Número de incorporación /constitución',
  registeredAddress: 'Dirección de la oficina registrada',
  mailingAddress: 'Dirección postal',
  phone: 'Teléfono (incluyendo código de área)',
  businessActivity: 'Descripción del negocio',
  offencesLabel: 'Delitos y sanciones',
  offenceConvicted:
    '¿Ha sido el Solicitante condenado en algún momento por algún delito penal o ha sido objeto de sanciones por parte de un organismo judicial, gubernamental, profesional o regulador?',
  offenceInvestigation: '¿Ha sido el Solicitante objeto en algún momento de una investigación judicial?',
  offenceDetails: 'En caso afirmativo, proporcione detalles:',
  applicantIsA: 'Si el Solicitante es:',
  stockExchange: 'Nombre completo de la bolsa de valores donde cotiza',
  tickerSymbol: 'Símbolo bursátil (ticker)',
  regulatedParentName: 'Si el Solicitante es subsidiaria de una entidad regulada, nombre de la entidad regulada:',
  regulatorName: 'Nombre del regulador',
  country: 'País',
  governmentEntityType: 'Tipo de entidad gubernamental',
  pleaseAttach: 'Por favor adjunte',
  privateNote:
    'Los Formularios de Cumplimiento y documentos KYC deben presentarse para al menos 2 Directores con control y todos los Accionistas y Beneficiarios Finales que posean el 10% o más del total de acciones ordinarias emitidas de la Empresa Privada.',
  beneficiaries: 'Beneficiario(s)',
  settlorNameAddress: 'Nombre y dirección del Fideicomitente',
  trusteesNameAddress: 'Nombre y dirección del/los Fiduciario(s)',
  enforcerNameAddress: 'Nombre y dirección del Ejecutor',
  protectorNameAddress: 'Nombre y dirección del Protector',
  beneficiary: 'Nombre/ número y dirección del Beneficiario',
  trustNote: 'Los Formularios de Cumplimiento y documentos KYC deben presentarse para todas las partes indicadas arriba.',
  partnershipNote:
    'Los Formularios de Cumplimiento y documentos KYC deben presentarse para el Socio General y todos los Socios Limitados/Otros con una participación del 10% o más del capital aportado.',
  noteLabel: 'Nota',
  fatcaLabel: 'Clasificación FATCA/CRS',
  fatcaGiin: 'En caso afirmativo, indique el número GIIN',
  fatcaSponsorGiin: 'En caso afirmativo, indique el número GIIN del patrocinador',
  fatcaExemptReason: 'En caso afirmativo, indique el motivo/tipo',
  taxResidencyLabel: 'Residencia fiscal',
  usEntity:
    '¿Es la Entidad una entidad de EE. UU., residente en EE. UU. para fines tributarios, o ha optado por ser tratada como entidad de EE. UU. para fines tributarios?',
  einPrompt: 'En caso afirmativo, proporcione el número de identificación EI',
  einNumber: 'No. EI:',
  otherTaxResidence: '¿Es la Entidad residente o está domiciliada en algún otro país?',
  otherTaxResidenceDetails: 'En caso afirmativo, proporcione detalles:',
  taxIdNumber: 'No. de identificación tributaria:',
  selfCertNote: 'Por favor complete y presente el Formulario de Declaración de Autocertificación de la Entidad',
  declaration:
    'Por la presente confirmo que los datos anteriores son verdaderos y exactos, y me comprometo a informarles en caso de que alguna de las circunstancias cambie, dentro de los 14 días siguientes a dicho cambio.',
  signature: 'Representante legal o firma autorizada',
  declarationDate: 'Fecha (dd/mm/aaaa)',
  notesTitle: 'NOTAS',
  notes: kyceMaster.NOTES_ES,
  yes: 'Sí',
  no: 'No',
});

function normalizeLanguage(lang) {
  const s = String(lang || 'es').toLowerCase();
  return s.startsWith('en') ? 'en' : 'es';
}

function getKycePdfDict(lang) {
  return normalizeLanguage(lang) === 'en' ? EN : ES;
}

function assertKycePdfI18nParity() {
  const esKeys = Object.keys(ES).sort();
  const enKeys = Object.keys(EN).sort();
  if (esKeys.length !== enKeys.length || esKeys.some((k, i) => k !== enKeys[i])) {
    const missingInEn = esKeys.filter((k) => !enKeys.includes(k));
    const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
    throw new Error(
      `kycePdfI18n: diccionarios desalineados. Faltan en EN: [${missingInEn.join(',')}], faltan en ES: [${missingInEs.join(',')}]`
    );
  }
}

module.exports = {
  ES,
  EN,
  normalizeLanguage,
  getKycePdfDict,
  assertKycePdfI18nParity,
};
