'use strict';

const ES = Object.freeze({
  docTitle: 'Declaración de Fondos',
  docSubtitle: 'Declaración de origen de fondos',
  sectionCompany: 'I. Datos de la entidad',
  sectionBeneficiary: 'II. Beneficiario final',
  sectionFunds: 'III. Origen de los fondos',
  sectionCustody: 'IV. Custodia / contacto',
  sectionSignature: 'V. Firma',
  companyName: 'Razón social',
  activities: 'Actividades',
  country: 'País',
  operatingAddress: 'Dirección de operaciones',
  beneficiaryName: 'Beneficiario final',
  birthDate: 'Fecha de nacimiento',
  birthPlace: 'Lugar de nacimiento',
  address: 'Dirección',
  fundsOther: 'Otras formas de ingreso',
  custodyName: 'Nombre',
  custodyPhone: 'Teléfono',
  custodyEmail: 'Correo',
  custodyAddress: 'Dirección',
  fiscalYear: 'Periodo fiscal',
  signerName: 'Nombre del firmante',
  date: 'Fecha',
  fundsSource: 'Origen de fondos',
  fundsSourceDesc: 'El origen del dinero utilizado para la formación de esta Compañía // Fundación proviene de:',
  fundsBienes: 'Bienes personales',
  fundsInversiones: 'Inversiones financieras',
  fundsNegocios: 'Negocios',
  fundsPrestamos: 'Préstamos',
  fundsHerencia: 'Herencia',
  fundsOtras: 'Otras formas de ingreso',
  custodyDesc: 'De acuerdo a la Ley 52 del 27 de octubre de 2016 "Que establece la obligación de mantener registros contables para determindas personas jurídicas y dicta otras disposiciones," la persona encargada de la custodia de los registros contables y documentación de respaldo de la Compañía es:',
  custodyAddressDesc: 'Que dichos registros contables y documentos de respaldo se mantienen bajo custodia en la siguiente dirección:',
  declarationText: 'Yo/ Nosotros declaro/declaramos que el origen de los fondos y bienes vinculados a los servicios prestados por Law Tax Lawyers y sus afiliados derivan de fuentes legitimas y sin origen criminal. También confirmo/confirmamos que la información antes proporcionada es veraz, y que ustedes están autorizados a aportar cualquier información por propósitos de debida diligencia a las entidades reguladoras de ser requerida por ellos. Nosotros también acordamos notificarles respecto a cualquier cambio en la información antes proporcionada.',
  signatureLabel: 'Firma',
});

const EN = Object.freeze({
  docTitle: 'Source of Funds Declaration',
  docSubtitle: 'Funds declaration form',
  sectionCompany: 'I. Entity information',
  sectionBeneficiary: 'II. Ultimate beneficiary',
  sectionFunds: 'III. Source of funds',
  sectionCustody: 'IV. Custody / contact',
  sectionSignature: 'V. Signature',
  companyName: 'Company name',
  activities: 'Activities',
  country: 'Country',
  operatingAddress: 'Operating address',
  beneficiaryName: 'Ultimate beneficiary',
  birthDate: 'Date of birth',
  birthPlace: 'Place of birth',
  address: 'Address',
  fundsOther: 'Other',
  custodyName: 'Name',
  custodyPhone: 'Phone',
  custodyEmail: 'Email',
  custodyAddress: 'Address',
  fiscalYear: 'Fiscal year',
  signerName: 'Signer name',
  date: 'Date',
  fundsSource: 'Source of funds',
  fundsSourceDesc: 'The origin of the money used for the formation of this Company // Foundation comes from:',
  fundsBienes: 'Personal assets',
  fundsInversiones: 'Financial investments',
  fundsNegocios: 'Business',
  fundsPrestamos: 'Loans',
  fundsHerencia: 'Inheritance',
  fundsOtras: 'Other',
  custodyDesc: 'According to Law 52 of October 27, 2016 "Which establishes the obligation to maintain accounting records for certain legal persons and dictates other provisions," the person responsible for the custody of accounting records and supporting documentation of the Company is:',
  custodyAddressDesc: 'That such accounting records and supporting documents are maintained in custody at the following address:',
  declarationText: 'I/We declare that the origin of funds and goods linked to the services provided by Law Tax Lawyers and its associates derive from legitimate sources and without criminal origin. I/We also confirm that the information provided above is true, and that you are authorized to provide any information for due diligence purposes to regulatory entities if required by them. We also agree to notify you regarding any changes in the information previously provided.',
  signatureLabel: 'Signature',
});

function normalizeLanguage(lang) {
  const s = String(lang || 'es').toLowerCase().slice(0, 2);
  return s === 'en' ? 'en' : 'es';
}

function getFondosPdfDict(lang) {
  return normalizeLanguage(lang) === 'en' ? EN : ES;
}

module.exports = { getFondosPdfDict, normalizeLanguage };
