'use strict';

const ES = Object.freeze({
  docTitle: 'Declaración de Fondos',
  docSubtitle: 'Source of Funds Declaration / Declaración de origen de fondos',
  sectionCompany: 'I. Datos de la entidad',
  sectionBeneficiary: 'II. Beneficiario final',
  sectionFunds: 'III. Origen de los fondos',
  sectionCustody: 'IV. Custodia / contacto',
  sectionSignature: 'V. Firma',
  companyName: 'Razón social / Company name',
  activities: 'Actividades / Activities',
  country: 'País / Country',
  beneficiaryName: 'Beneficiario final / Ultimate beneficiary',
  birthDate: 'Fecha de nacimiento / Date of birth',
  birthPlace: 'Lugar de nacimiento / Place of birth',
  address: 'Dirección / Address',
  fundsOther: 'Otras formas de ingreso / Other',
  custodyName: 'Nombre / Name',
  custodyPhone: 'Teléfono / Phone',
  custodyEmail: 'Correo / Email',
  custodyAddress: 'Dirección / Address',
  signerName: 'Nombre del firmante / Signer name',
  date: 'Fecha / Date',
  fundsSource: 'Origen de fondos / Source of funds',
  fundsBienes: 'Bienes personales / Personal assets',
  fundsInversiones: 'Inversiones financieras / Financial investments',
  fundsNegocios: 'Negocios / Business',
  fundsPrestamos: 'Préstamos / Loans',
  fundsHerencia: 'Herencia / Inheritance',
  fundsOtras: 'Otras formas de ingreso / Other',
});

const EN = Object.freeze({
  ...ES,
  docTitle: 'Source of Funds Declaration',
  docSubtitle: 'Funds declaration form',
  sectionCompany: 'I. Entity information',
  sectionBeneficiary: 'II. Ultimate beneficiary',
  sectionFunds: 'III. Source of funds',
  sectionCustody: 'IV. Custody / contact',
  sectionSignature: 'V. Signature',
});

function normalizeLanguage(lang) {
  const s = String(lang || 'es').toLowerCase().slice(0, 2);
  return s === 'en' ? 'en' : 'es';
}

function getFondosPdfDict(lang) {
  return normalizeLanguage(lang) === 'en' ? EN : ES;
}

module.exports = { getFondosPdfDict, normalizeLanguage };
