'use strict';

/**
 * KYCI (PTL_KYC — Compliance Form — Individuals) — estructura canónica.
 * Fuente: templates/templates_config.json (cumplimiento_individual), anclas fill_pdf_expert,
 * coordenadas funds_checkboxes del PDF maestro plano (0 AcroForm).
 *
 * Secciones en orden del PDF:
 *   I.   Datos personales
 *   II.  Contacto y actividad
 *   III. Cumplimiento, PEP y origen de fondos
 *   IV.  Declaración
 *
 * Regenerar desde PDF: node server/scripts/extract_kyci_pdf_structure.py <ruta/KYCI.pdf>
 */

const FUNDS_SOURCE_OPTIONS = Object.freeze([
  { key: 'Bienes personales', labelKey: 'bienes', pdfCheckboxKey: 'bienes' },
  { key: 'Inversiones Financieras', labelKey: 'inversiones', pdfCheckboxKey: 'inversiones' },
  { key: 'Negocios', labelKey: 'negocios', pdfCheckboxKey: 'negocios' },
  { key: 'Prestamos', labelKey: 'prestamos', pdfCheckboxKey: 'prestamos' },
  { key: 'Herencia o Fondo Fiduciario', labelKey: 'herencia', pdfCheckboxKey: 'herencia' },
  { key: 'Otras formas de ingresos', labelKey: 'otras', pdfCheckboxKey: 'otras' },
]);

const MARITAL_STATUS_OPTIONS = Object.freeze([
  'Soltero(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viudo(a)',
  'Unión libre',
]);

/** Etiquetas ES tal como figuran en el PDF maestro (bilingüe EN // ES en muchos campos). */
const FIELD_LABELS_ES = Object.freeze({
  fullName: 'Nombre completo / Full Name',
  birthDate: 'Fecha de nacimiento / Date of Birth',
  birthPlace: 'Lugar de nacimiento / Place of Birth',
  maritalStatus: 'Estado civil / Marital Status',
  nationality: 'Nacionalidad / Nationality',
  passport: 'Pasaporte / Passport',
  idCard: 'Cédula o ID / ID Card',
  phone: 'Teléfono / Phone',
  email: 'Correo electrónico / Email',
  address: 'Dirección / Address',
  city: 'Ciudad / City',
  country: 'País / Country',
  occupation: 'Ocupación o profesión / Occupation',
  employer: 'Empleador / Employer',
  pep: 'Persona expuesta políticamente (PEP) / Politically Exposed Person',
  pepDetails: 'Detalle PEP / PEP Details',
  fundsSource: 'Origen de fondos o patrimonio / Source of Funds or Wealth',
  fundsOther: 'Otras fuentes (especifique) / Other (specify)',
  declarationName: 'Nombre del declarante / Declarant Name',
  declarationDate: 'Fecha / Date',
});

const FIELD_LABELS_EN = Object.freeze({
  fullName: 'Full Name / Nombre completo',
  birthDate: 'Date of Birth / Fecha de nacimiento',
  birthPlace: 'Place of Birth / Lugar de nacimiento',
  maritalStatus: 'Marital Status / Estado civil',
  nationality: 'Nationality / Nacionalidad',
  passport: 'Passport / Pasaporte',
  idCard: 'ID Card / Cédula o ID',
  phone: 'Phone / Teléfono',
  email: 'Email / Correo electrónico',
  address: 'Address / Dirección',
  city: 'City / Ciudad',
  country: 'Country / País',
  occupation: 'Occupation / Ocupación o profesión',
  employer: 'Employer / Empleador',
  pep: 'Politically Exposed Person (PEP) / Persona expuesta políticamente',
  pepDetails: 'PEP Details / Detalle PEP',
  fundsSource: 'Source of Funds or Wealth / Origen de fondos o patrimonio',
  fundsOther: 'Other (specify) / Otras fuentes',
  declarationName: 'Declarant Name / Nombre del declarante',
  declarationDate: 'Date / Fecha',
});

const SECTIONS = Object.freeze([
  {
    sectionKey: 'sectionPersonal',
    stepId: 'personal',
    titleEs: 'I. Datos personales',
    titleEn: 'I. Personal information',
    fieldKeys: Object.freeze([
      'fullName',
      'birthDate',
      'birthPlace',
      'maritalStatus',
      'nationality',
      'passport',
      'idCard',
    ]),
  },
  {
    sectionKey: 'sectionContact',
    stepId: 'contact',
    titleEs: 'II. Contacto y actividad',
    titleEn: 'II. Contact and occupation',
    fieldKeys: Object.freeze([
      'phone',
      'email',
      'address',
      'city',
      'country',
      'occupation',
      'employer',
    ]),
  },
  {
    sectionKey: 'sectionCompliance',
    stepId: 'compliance',
    titleEs: 'III. Cumplimiento, PEP y origen de fondos',
    titleEn: 'III. Compliance, PEP and source of funds',
    fieldKeys: Object.freeze(['pep', 'pepDetails', 'fundsOther']),
    fundsSource: true,
  },
  {
    sectionKey: 'sectionDeclaration',
    stepId: 'declaration',
    titleEs: 'IV. Declaración',
    titleEn: 'IV. Declaration',
    fieldKeys: Object.freeze(['declarationName', 'declarationDate']),
  },
]);

function flattenAllFieldKeys() {
  const keys = [];
  for (const section of SECTIONS) {
    keys.push(...section.fieldKeys);
    if (section.fundsSource) keys.push('fundsSource');
  }
  return keys;
}

const KYCI_ALL_FIELD_KEYS = Object.freeze(flattenAllFieldKeys());

const DATE_FIELD_KEYS = new Set(['birthDate', 'declarationDate']);

const REQUIRED_BY_STEP = Object.freeze({
  personal: ['fullName', 'birthDate', 'birthPlace', 'nationality', 'passport'],
  contact: ['phone', 'email', 'address', 'city', 'country', 'occupation'],
  compliance: ['pep', 'fundsSource'],
  declaration: ['declarationName', 'declarationDate'],
});

module.exports = {
  FUNDS_SOURCE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  FIELD_LABELS_ES,
  FIELD_LABELS_EN,
  SECTIONS,
  KYCI_ALL_FIELD_KEYS,
  DATE_FIELD_KEYS,
  REQUIRED_BY_STEP,
};
