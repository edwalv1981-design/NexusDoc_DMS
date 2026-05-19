'use strict';

const ES = Object.freeze({
  docTitle: 'Formulario de Cumplimiento — Persona Natural',
  docSubtitle: 'PTL / KYC — Individual Compliance',
  sectionPersonal: 'I. Datos personales',
  sectionContact: 'II. Contacto y actividad',
  sectionCompliance: 'III. Cumplimiento, PEP y origen de fondos',
  sectionDeclaration: 'Declaración',
  firstName: 'Nombre',
  secondName: 'Segundo nombre',
  lastName: 'Apellidos',
  birthDate: 'Fecha de nacimiento',
  birthPlace: 'Lugar de nacimiento',
  maritalStatus: 'Estado civil',
  nationality: 'Nacionalidad',
  passport: 'Pasaporte / cédula',
  idCard: 'Documento de identidad',
  phone: 'Teléfono',
  email: 'Correo electrónico',
  address: 'Dirección',
  city: 'Ciudad',
  country: 'País',
  occupation: 'Ocupación / profesión',
  employer: 'Empleador',
  pep: 'Persona expuesta políticamente (PEP)',
  pepDetails: 'Detalle PEP',
  fundsSource: 'Origen de fondos / patrimonio',
  fundsOther: 'Otras fuentes (especifique)',
  declarationName: 'Nombre en declaración',
  declarationDate: 'Fecha de declaración',
  fundsBienes: 'Bienes personales',
  fundsInversiones: 'Inversiones financieras',
  fundsNegocios: 'Negocios',
  fundsPrestamos: 'Préstamos',
  fundsHerencia: 'Herencia o fondo fiduciario',
  yes: 'Sí',
  no: 'No',
});

const EN = Object.freeze({
  docTitle: 'Compliance Form — Individual',
  docSubtitle: 'PTL / KYC — Individual Compliance',
  sectionPersonal: 'I. Personal information',
  sectionContact: 'II. Contact and occupation',
  sectionCompliance: 'III. Compliance, PEP and source of funds',
  sectionDeclaration: 'Declaration',
  firstName: 'First name',
  secondName: 'Middle name',
  lastName: 'Surname(s)',
  birthDate: 'Date of birth',
  birthPlace: 'Place of birth',
  maritalStatus: 'Marital status',
  nationality: 'Nationality',
  passport: 'Passport / ID',
  idCard: 'ID document',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',
  city: 'City',
  country: 'Country',
  occupation: 'Occupation / profession',
  employer: 'Employer',
  pep: 'Politically exposed person (PEP)',
  pepDetails: 'PEP details',
  fundsSource: 'Source of funds / wealth',
  fundsOther: 'Other sources (specify)',
  declarationName: 'Name on declaration',
  declarationDate: 'Declaration date',
  fundsBienes: 'Personal assets',
  fundsInversiones: 'Financial investments',
  fundsNegocios: 'Business activities',
  fundsPrestamos: 'Loans',
  fundsHerencia: 'Inheritance or trust fund',
  yes: 'Yes',
  no: 'No',
});

function normalizeLanguage(lang) {
  const s = String(lang || 'es').toLowerCase();
  return s.startsWith('en') ? 'en' : 'es';
}

function getKyciPdfDict(lang) {
  return normalizeLanguage(lang) === 'en' ? EN : ES;
}

module.exports = {
  ES,
  EN,
  normalizeLanguage,
  getKyciPdfDict,
};
