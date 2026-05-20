'use strict';

const ES = Object.freeze({
  docTitle: 'PTL_KYC — Formulario de Cumplimiento — Personas Naturales',
  docSubtitle: 'Compliance Form — Individuals',
  sectionPersonal: 'I. Datos personales',
  sectionContact: 'II. Contacto y actividad',
  sectionCompliance: 'III. Cumplimiento, PEP y origen de fondos',
  sectionDeclaration: 'Declaración',
  sectionPersonalGuide:
    'Complete los datos personales tal como figuran en su pasaporte o documento de identidad oficial.',
  sectionContactGuide: 'Indique datos de contacto vigentes y su ocupación o actividad económica principal.',
  sectionComplianceGuide:
    'Declare si es persona expuesta políticamente (PEP) y marque todas las fuentes que apliquen al origen de sus fondos o patrimonio.',
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
  docTitle: 'PTL_KYC — Compliance Form — Individuals',
  docSubtitle: 'Formulario de Cumplimiento — Personas Naturales',
  sectionPersonal: 'I. Personal information',
  sectionContact: 'II. Contact and occupation',
  sectionCompliance: 'III. Compliance, PEP and source of funds',
  sectionDeclaration: 'Declaration',
  sectionPersonalGuide:
    'Enter personal details exactly as shown on your passport or official ID document.',
  sectionContactGuide: 'Provide current contact details and your main occupation or economic activity.',
  sectionComplianceGuide:
    'State whether you are a politically exposed person (PEP) and check all applicable sources of funds or wealth.',
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

function assertKyciPdfI18nParity() {
  const esKeys = Object.keys(ES).sort();
  const enKeys = Object.keys(EN).sort();
  if (esKeys.length !== enKeys.length || esKeys.some((k, i) => k !== enKeys[i])) {
    const missingInEn = esKeys.filter((k) => !enKeys.includes(k));
    const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
    throw new Error(
      `kyciPdfI18n: diccionarios desalineados. Faltan en EN: [${missingInEn.join(',')}], faltan en ES: [${missingInEs.join(',')}]`
    );
  }
}

module.exports = {
  ES,
  EN,
  normalizeLanguage,
  getKyciPdfDict,
  assertKyciPdfI18nParity,
};
