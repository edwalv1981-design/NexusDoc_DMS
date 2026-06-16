'use strict';

const ES = Object.freeze({
  docTitle: 'PTL_KYC — Formulario de Cumplimiento — Personas Jurídicas',
  docSubtitle: 'Compliance Form — Entities',
  sectionEntity: 'I. Datos de la entidad',
  sectionContact: 'II. Contacto y actividad',
  sectionRepresentatives: 'III. Representantes y beneficiarios finales',
  sectionCompliance: 'IV. Cumplimiento, PEP y origen de fondos',
  sectionDeclaration: 'Declaración',
  sectionEntityGuide:
    'This form is for completion, in respect of the Company, by each company, trust or partnership which owns or proposes owning, directly or indirectly 10% or greater of the share capital of the Company; that is a Corporate Director of the Company, or is a holder of a Power of Attorney (together, referred to as “Applicant”). Note that an original copy of the executed Compliance Form must be sent together with the required due diligence documents.',
  sectionContactGuide: 'Description of Business',
  sectionRepresentativesGuide:
    'If Applicant is a: Public Company, Regulated Entity, Government Entity, Private Company, Trust/ Corp / or Foundation, Partnerships. Please provide Certified copies of corresponding documents.',
  sectionComplianceGuide:
    'Offences and Sanctions: Has the Applicant at any time been convicted of any criminal offence or been subject to sanctions by a Judicial, Government, Professional or Regulatory body? Has the Applicant at any time been the subject of a judicial enquiry/investigation?\nFATCA/CRS Classification & Tax Residency: Provide details regarding U.S. and other country residencies.',
  sectionDeclarationGuide:
    'Note: Please complete and submit the Entity Self Certification Declaration Form.\nI hereby confirm that the above details are true and accurate and I undertake to advise you in the event that any of the circumstances change within 14 days of those changes occurring.',
  legalName: 'Razón social',
  tradeName: 'Nombre comercial',
  entityType: 'Tipo de entidad',
  incorporationDate: 'Fecha de constitución',
  jurisdiction: 'Jurisdicción de constitución',
  taxId: 'RUC / NIT / identificación fiscal',
  registrationNumber: 'Número de registro',
  registeredAddress: 'Domicilio social',
  phone: 'Teléfono',
  email: 'Correo electrónico',
  city: 'Ciudad',
  country: 'País de operación',
  businessActivity: 'Objeto social / actividad principal',
  website: 'Sitio web',
  legalRepName: 'Representante legal — nombre',
  legalRepId: 'Representante legal — documento',
  legalRepNationality: 'Representante legal — nacionalidad',
  beneficialOwners: 'Beneficiarios finales',
  pep: 'Persona o entidad expuesta políticamente (PEP)',
  pepDetails: 'Detalle PEP',
  fundsSource: 'Origen de fondos / patrimonio',
  fundsOther: 'Otras fuentes (especifique)',
  declarationName: 'Nombre en declaración',
  declarationDate: 'Fecha de declaración',
  fundsBienes: 'Bienes de la entidad',
  fundsInversiones: 'Inversiones financieras',
  fundsNegocios: 'Ingresos por negocios',
  fundsPrestamos: 'Préstamos / créditos',
  fundsHerencia: 'Aportes de socios / capital',
  yes: 'Sí',
  no: 'No',
});

const EN = Object.freeze({
  docTitle: 'PTL_KYC — Compliance Form — Entities',
  docSubtitle: 'Formulario de Cumplimiento — Personas Jurídicas',
  sectionEntity: 'I. Entity information',
  sectionContact: 'II. Contact and business activity',
  sectionRepresentatives: 'III. Representatives and beneficial owners',
  sectionCompliance: 'IV. Compliance, PEP and source of funds',
  sectionDeclaration: 'Declaration',
  sectionEntityGuide:
    'This form is for completion, in respect of the Company, by each company, trust or partnership which owns or proposes owning, directly or indirectly 10% or greater of the share capital of the Company; that is a Corporate Director of the Company, or is a holder of a Power of Attorney (together, referred to as “Applicant”). Note that an original copy of the executed Compliance Form must be sent together with the required due diligence documents.',
  sectionContactGuide: 'Description of Business',
  sectionRepresentativesGuide:
    'If Applicant is a: Public Company, Regulated Entity, Government Entity, Private Company, Trust/ Corp / or Foundation, Partnerships. Please provide Certified copies of corresponding documents.',
  sectionComplianceGuide:
    'Offences and Sanctions: Has the Applicant at any time been convicted of any criminal offence or been subject to sanctions by a Judicial, Government, Professional or Regulatory body? Has the Applicant at any time been the subject of a judicial enquiry/investigation?\nFATCA/CRS Classification & Tax Residency: Provide details regarding U.S. and other country residencies.',
  sectionDeclarationGuide:
    'Note: Please complete and submit the Entity Self Certification Declaration Form.\nI hereby confirm that the above details are true and accurate and I undertake to advise you in the event that any of the circumstances change within 14 days of those changes occurring.',
  legalName: 'Legal name',
  tradeName: 'Trade name',
  entityType: 'Entity type',
  incorporationDate: 'Date of incorporation',
  jurisdiction: 'Jurisdiction of incorporation',
  taxId: 'Tax ID / registration number',
  registrationNumber: 'Commercial registry number',
  registeredAddress: 'Registered address',
  phone: 'Phone',
  email: 'Email',
  city: 'City',
  country: 'Country of operation',
  businessActivity: 'Corporate purpose / main activity',
  website: 'Website',
  legalRepName: 'Legal representative — name',
  legalRepId: 'Legal representative — ID',
  legalRepNationality: 'Legal representative — nationality',
  beneficialOwners: 'Beneficial owners',
  pep: 'Politically exposed person or entity (PEP)',
  pepDetails: 'PEP details',
  fundsSource: 'Source of funds / wealth',
  fundsOther: 'Other sources (specify)',
  declarationName: 'Name on declaration',
  declarationDate: 'Declaration date',
  fundsBienes: 'Entity assets',
  fundsInversiones: 'Financial investments',
  fundsNegocios: 'Business income',
  fundsPrestamos: 'Loans / credit',
  fundsHerencia: 'Shareholder contributions / capital',
  yes: 'Yes',
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
