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
  operatingAddress: 'Dirección de operaciones / Operating address',
  beneficiaryName: 'Beneficiario final / Ultimate beneficiary',
  birthDate: 'Fecha de nacimiento / Date of birth',
  birthPlace: 'Lugar de nacimiento / Place of birth',
  address: 'Dirección / Address',
  fundsOther: 'Otras formas de ingreso / Other',
  custodyName: 'Nombre / Name',
  custodyPhone: 'Teléfono / Phone',
  custodyEmail: 'Correo / Email',
  custodyAddress: 'Dirección / Address',
  fiscalYear: 'Periodo fiscal / Fiscal year',
  signerName: 'Nombre del firmante / Signer name',
  date: 'Fecha / Date',
  fundsSource: 'Origen de fondos / Source of funds',
  fundsBienes: 'Bienes personales / Personal assets',
  fundsInversiones: 'Inversiones financieras / Financial investments',
  fundsNegocios: 'Negocios / Business',
  fundsPrestamos: 'Préstamos / Loans',
  fundsHerencia: 'Herencia / Inheritance',
  fundsOtras: 'Otras formas de ingreso / Other',
  declarationText: 'Yo/ Nosotros declaro/declaramos que el origen de los fondos y bienes vinculados a los servicios prestados por Law Tax Lawyers y sus afiliados derivan de fuentes legitimas y sin origen criminal. También confirmo/confirmamos que la información antes proporcionada es veraz, y que ustedes están autorizados a aportar cualquier información por propósitos de debida diligencia a las entidades reguladoras de ser requerida por ellos. Nosotros también acordamos notificarles respecto a cualquier cambio en la información antes proporcionada.',
  declarationTextEn: 'I/We declare that the origin of funds and goods linked to the services provided by Law Tax Lawyers and its associates derive from legitimate sources and without criminal origin. I/We also confirm that the information provided above is true, and that you are authorized to provide any information for due diligence purposes to regulatory entities if required by them. We also agree to notify you regarding any changes in the information previously provided.',
  signatureLabel: 'Signature // Firma',
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
