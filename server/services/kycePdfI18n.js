'use strict';

const ES = Object.freeze({
  docTitle: 'Formulario de Cumplimiento — Persona Jurídica',
  docSubtitle: 'PTL / KYC — Entity Compliance',
  sectionEntity: 'I. Datos de la entidad',
  sectionContact: 'II. Contacto y actividad',
  sectionRepresentatives: 'III. Representantes, beneficiarios y cumplimiento',
  sectionDeclaration: 'Declaración',
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
  docTitle: 'Compliance Form — Legal Entity',
  docSubtitle: 'PTL / KYC — Entity Compliance',
  sectionEntity: 'I. Entity information',
  sectionContact: 'II. Contact and business activity',
  sectionRepresentatives: 'III. Representatives, beneficial owners and compliance',
  sectionDeclaration: 'Declaration',
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

module.exports = {
  ES,
  EN,
  normalizeLanguage,
  getKycePdfDict,
};
