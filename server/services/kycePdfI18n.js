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
    'Datos de constitución y registro de la entidad según documentos societarios vigentes.',
  sectionContactGuide: 'Información de contacto y descripción de la actividad principal de la entidad.',
  sectionRepresentativesGuide:
    'Identifique al representante legal y a los beneficiarios finales con participación igual o superior al 25%.',
  sectionComplianceGuide:
    'Indique si la entidad o sus controladores son PEP y seleccione el origen de fondos o patrimonio aplicable.',
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
    'Entity incorporation and registration details as shown on current corporate documents.',
  sectionContactGuide: 'Contact information and description of the entity’s main business activity.',
  sectionRepresentativesGuide:
    'Identify the legal representative and beneficial owners with 25% or more ownership or control.',
  sectionComplianceGuide:
    'State whether the entity or its controllers are PEPs and check all applicable sources of funds or wealth.',
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
