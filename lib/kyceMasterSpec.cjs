'use strict';

/**
 * KYCE — PTL_KYC "Compliance Form — Companies/Trusts/Partnerships"
 * (Know Your Client Procedure). FUENTE ÚNICA de campos, obligatorios, textos y
 * orden del formulario y del PDF. Debe coincidir con la plantilla oficial
 * (versión 2026-11, 3 páginas; sin sección de Partnerships):
 *
 *   I.   Applicant / Solicitante (datos registrales, delitos y sanciones)
 *   II.  If Applicant is a… (empresa pública, regulada, gubernamental, privada,
 *        fideicomiso/fundación, sociedad de personas) + documentos
 *   III. FATCA/CRS Classification y Tax Residency
 *   IV.  Declaración y firmas
 *
 * Regla: un campo con showIf solo se muestra y exige cuando se cumple la condición.
 * Compatibilidad: claves del formato anterior (LEGACY_FIELD_KEYS) se conservan en
 * los datos guardados pero ya no se capturan.
 */

const YES = 'Sí';
const NO = 'No';
const YES_NO = Object.freeze([NO, YES]);

/** "Applicant is one or more of the following" (10 casillas, plantilla 2026-11). */
const APPLICANT_ROLE_OPTIONS = Object.freeze([
  { key: 'shareholder', en: 'Shareholder', es: 'Accionista' },
  { key: 'director', en: 'Director', es: 'Director' },
  { key: 'generalPartner', en: 'General Partner', es: 'Socio general' },
  { key: 'beneficialOwner', en: 'Beneficial Owner', es: 'Beneficiario final' },
  { key: 'authorisedSignatory', en: 'Authorised Signatory', es: 'Firmante autorizado' },
  { key: 'powerOfAttorney', en: 'Power of Attorney', es: 'Apoderado' },
  { key: 'founderSettlor', en: 'Founder/Settlor', es: 'Fundador/Fideicomitente' },
  { key: 'enforcer', en: 'Enforcer', es: 'Ejecutor' },
  { key: 'protector', en: 'Protector', es: 'Protector' },
  { key: 'member', en: 'Member', es: 'Miembro' },
]);

const APPLICANT_TYPE_OPTIONS = Object.freeze([
  { key: 'publicCompany', en: 'Public Company', es: 'Empresa pública' },
  {
    key: 'regulatedEntity',
    en: 'Regulated Entity or subsidiary of a Regulated Entity in an equivalent Jurisdiction',
    es: 'Entidad regulada o subsidiaria de una entidad regulada en una jurisdicción equivalente',
  },
  { key: 'governmentEntity', en: 'Government Entity', es: 'Entidad gubernamental' },
  { key: 'privateCompany', en: 'Private Company', es: 'Empresa privada' },
  { key: 'trustFoundation', en: 'Trust', es: 'Fideicomiso (Trust)' },
]);

/** Tipo del formato anterior: ya no se ofrece; se muestra si un trámite antiguo lo tiene. */
const LEGACY_APPLICANT_TYPE_OPTIONS = Object.freeze([
  { key: 'partnership', en: 'Partnerships', es: 'Sociedades de personas (partnerships)' },
]);

const PRIVATE_DOC_OPTIONS = Object.freeze([
  { key: 'certIncorporation', required: true, en: 'Copy of Certificate of Incorporation', es: 'Copia del Certificado de Incorporación' },
  { key: 'certGoodStanding', required: true, en: 'Copy of Certificate of Good Standing or similar doc', es: 'Copia del Certificado de Vigencia (Good Standing) o documento similar' },
  { key: 'registeredAddressCert', required: true, en: 'Copy of registered address certification or Utility bill', es: 'Copia de la certificación de la dirección registrada o planilla de servicios básicos' },
  { key: 'registerDirectors', required: true, en: 'Copy of Register of Directors and officers', es: 'Copia del Registro de Directores y dignatarios' },
  { key: 'registerMembers', required: true, en: 'Copy of Register of Members', es: 'Copia del Registro de Accionistas (Members)' },
  { key: 'ownershipChart', required: true, en: 'Copy of the Ownership Structure Chart', es: 'Copia del Organigrama de la Estructura de Propiedad' },
]);

/** Empresa privada: cuenta bancaria o, si no tiene, carta de abogado/contador (al menos uno). */
const PRIVATE_BANK_DOC_OPTIONS = Object.freeze([
  { key: 'bankStatement', en: 'Copy of Bank statement or Bank certificate', es: 'Copia del estado de cuenta bancario o certificado bancario' },
  { key: 'attorneyLetter', en: 'Attorney or Accountant reference letter', es: 'Carta de referencia de un abogado o contador' },
]);

/** Documentos del formato anterior: se muestran solo si un trámite antiguo los marcó. */
const LEGACY_PRIVATE_DOC_OPTIONS = Object.freeze([
  { key: 'latestAccounts', en: 'Certified copy of latest report and accounts', es: 'Copia certificada del último informe y estados financieros' },
]);

const TRUST_DOC_OPTIONS = Object.freeze([
  { key: 'trustDeed', required: true, en: 'Copy of Trust Deed or Declaration of Trust', es: 'Copia de la Escritura o Declaración de Fideicomiso' },
  { key: 'certRegistration', en: 'Copy of Certificate of Registration (If Applicable)', es: 'Copia del Certificado de Registro (si aplica)' },
  {
    key: 'dueDiligence',
    required: true,
    en: 'Copy of Due Diligence on Settlor, Trustees, Beneficiaries, protectors (if any), enforcers (if any)',
    es: 'Copia de la Debida Diligencia del Fideicomitente, Fiduciarios, Beneficiarios, protectores (si los hay) y ejecutores (si los hay)',
  },
]);

/** Párrafo de autorización de datos de la plantilla (2026-11). */
const DATA_CONSENT_TEXT = Object.freeze({
  en: 'I acknowledge and authorize the use of this information, to collects, verifies, uses, and retains the personal data and KYC documents to verify my identity and meet its legal due diligence and anti-money laundering and counter-terrorist financing obligations; it may disclose them to competent authorities when required by law, retain them for the legally required period, and handle my rights of access, rectification, erasure, objection, and portability.',
  es: 'Reconozco y autorizo el uso de esta información para recopilar, verificar, usar y conservar los datos personales y documentos KYC con el fin de verificar mi identidad y cumplir las obligaciones legales de debida diligencia y de prevención del lavado de activos y del financiamiento del terrorismo; podrán entregarse a las autoridades competentes cuando la ley lo exija, conservarse durante el plazo legal, y se atenderán los derechos de acceso, rectificación, supresión, oposición y portabilidad.',
});

const PARTNERSHIP_DOC_OPTIONS = Object.freeze([
  { key: 'partnershipDeed', required: true, en: 'Certified copy of Partnership Deed', es: 'Copia certificada de la Escritura de Sociedad' },
  { key: 'authorisedPersons', required: true, en: 'Signed list of Authorised Persons', es: 'Lista firmada de Personas Autorizadas' },
  { key: 'latestAccounts', required: true, en: 'Certified copy of Latest Report and Accounts', es: 'Copia certificada del último informe y estados financieros' },
  { key: 'certRegistration', required: true, en: 'Certified copy of Certificate of Registration', es: 'Copia certificada del Certificado de Registro' },
  { key: 'registerPartners', required: true, en: 'Certified copy of Register of Partners', es: 'Copia certificada del Registro de Socios' },
]);

const FATCA_OPTIONS = Object.freeze([
  { key: 'registeredFFI', en: 'Registered FFI', es: 'FFI registrada' },
  { key: 'sponsoredFFI', en: 'Sponsored FFI', es: 'FFI patrocinada' },
  { key: 'exemptFFI', en: 'Exempt FFI', es: 'FFI exenta' },
  { key: 'activeNFFE', en: 'Active NFFE', es: 'NFFE activa' },
  { key: 'passiveNFFE', en: 'Passive NFFE', es: 'NFFE pasiva' },
]);

const type = (value) => ({ field: 'applicantType', value });
const yes = (field) => ({ field, value: YES });

/** Campos en el orden de la plantilla. */
const FIELDS = Object.freeze({
  panamaEntityName: { type: 'text', required: true },
  applicantRoles: { type: 'checkboxGroup', required: true, options: APPLICANT_ROLE_OPTIONS },
  legalName: { type: 'text', required: true },
  incorporationDate: { type: 'date', required: true },
  jurisdiction: { type: 'text', required: true },
  registrationNumber: { type: 'text', required: true },
  registeredAddress: { type: 'text', required: true },
  mailingAddress: { type: 'text' },
  phone: { type: 'text', required: true },
  businessActivity: { type: 'textarea', required: true },
  offenceConvicted: { type: 'radio', required: true, options: YES_NO },
  offenceConvictedDetails: { type: 'textarea', required: true, showIf: yes('offenceConvicted') },
  offenceInvestigation: { type: 'radio', required: true, options: YES_NO },
  offenceInvestigationDetails: { type: 'textarea', required: true, showIf: yes('offenceInvestigation') },

  applicantType: { type: 'radio', required: true, options: APPLICANT_TYPE_OPTIONS },
  stockExchange: { type: 'text', required: true, showIf: type('publicCompany') },
  tickerSymbol: { type: 'text', required: true, showIf: type('publicCompany') },
  regulatedEntity: { type: 'radio', required: true, options: YES_NO, showIf: type('regulatedEntity') },
  regulatedParentName: { type: 'text', showIf: type('regulatedEntity') },
  regulatorName: { type: 'text', required: true, showIf: type('regulatedEntity') },
  regulatorCountry: { type: 'text', required: true, showIf: type('regulatedEntity') },
  governmentEntity: { type: 'radio', required: true, options: YES_NO, showIf: type('governmentEntity') },
  governmentCountry: { type: 'text', required: true, showIf: type('governmentEntity') },
  governmentEntityType: { type: 'text', required: true, showIf: type('governmentEntity') },
  privateDocs: { type: 'checkboxGroup', required: true, options: PRIVATE_DOC_OPTIONS, showIf: type('privateCompany') },
  privateBankDocs: { type: 'checkboxGroup', required: true, options: PRIVATE_BANK_DOC_OPTIONS, showIf: type('privateCompany') },
  trustDocs: { type: 'checkboxGroup', required: true, options: TRUST_DOC_OPTIONS, showIf: type('trustFoundation') },
  settlorNameAddress: { type: 'text', required: true, showIf: type('trustFoundation') },
  trusteesNameAddress: { type: 'text', required: true, showIf: type('trustFoundation') },
  enforcerNameAddress: { type: 'text', showIf: type('trustFoundation') },
  protectorNameAddress: { type: 'text', showIf: type('trustFoundation') },
  beneficiary1: { type: 'textarea', required: true, showIf: type('trustFoundation') },
  beneficiary2: { type: 'text', showIf: type('trustFoundation') },
  beneficiary3: { type: 'text', showIf: type('trustFoundation') },
  beneficiary4: { type: 'text', showIf: type('trustFoundation') },
  partnershipDocs: { type: 'checkboxGroup', required: true, options: PARTNERSHIP_DOC_OPTIONS, showIf: type('partnership') },

  fatcaClassification: { type: 'radio', required: true, options: FATCA_OPTIONS },
  fatcaGiin: { type: 'text', required: true, showIf: { field: 'fatcaClassification', value: 'registeredFFI' } },
  fatcaSponsorGiin: { type: 'text', required: true, showIf: { field: 'fatcaClassification', value: 'sponsoredFFI' } },
  fatcaExemptReason: { type: 'text', required: true, showIf: { field: 'fatcaClassification', value: 'exemptFFI' } },
  usEntity: { type: 'radio', required: true, options: YES_NO },
  einNumber: { type: 'text', required: true, showIf: yes('usEntity') },
  otherTaxResidence: { type: 'radio', required: true, options: YES_NO },
  otherTaxResidenceDetails: { type: 'textarea', required: true, showIf: yes('otherTaxResidence') },
  taxIdNumber: { type: 'text', required: true, showIf: yes('otherTaxResidence') },

  dataConsent: { type: 'consent', required: true },
  declarationName: { type: 'text', required: true },
  declarationDate: { type: 'date', required: true },
  declarationName2: { type: 'text' },
  declarationDate2: { type: 'date' },
});

/** Etiquetas del formulario (un idioma). */
const FORM_LABELS = Object.freeze({
  es: {
    panamaEntityName: 'Nombre o nombre propuesto de la entidad panameña (Sociedad / Fundación / Fondo)',
    applicantRoles: 'El Solicitante es (marque una o más opciones)',
    legalName: 'Nombre registrado del Solicitante',
    incorporationDate: 'Fecha de incorporación / constitución',
    jurisdiction: 'Jurisdicción de incorporación / constitución',
    registrationNumber: 'Número de incorporación / constitución',
    registeredAddress: 'Dirección de la oficina registrada',
    mailingAddress: 'Dirección postal',
    phone: 'Teléfono (incluya código de área)',
    businessActivity: 'Descripción del negocio',
    offenceConvicted: '¿Ha sido el Solicitante condenado en algún momento por algún delito penal o ha sido objeto de sanciones por parte de un organismo judicial, gubernamental, profesional o regulador?',
    offenceConvictedDetails: 'Detalles',
    offenceInvestigation: '¿Ha sido el Solicitante objeto en algún momento de una investigación judicial?',
    offenceInvestigationDetails: 'Detalles',
    applicantType: 'El Solicitante es',
    stockExchange: 'Nombre completo de la bolsa de valores donde cotiza',
    tickerSymbol: 'Símbolo bursátil (ticker)',
    regulatedEntity: '¿Es una entidad regulada o subsidiaria de una entidad regulada?',
    regulatedParentName: 'Si el Solicitante es subsidiaria de una entidad regulada, nombre de la entidad regulada',
    regulatorName: 'Nombre del regulador',
    regulatorCountry: 'País',
    governmentEntity: '¿Es una entidad gubernamental?',
    governmentCountry: 'País',
    governmentEntityType: 'Tipo de entidad gubernamental',
    privateDocs: 'Adjunte',
    privateBankDocs: 'Cuenta bancaria (si no tiene cuenta bancaria, adjunte carta de abogado o contador)',
    trustDocs: 'Adjunte',
    settlorNameAddress: 'Nombre y dirección del Fideicomitente',
    trusteesNameAddress: 'Nombre y dirección del/los Fiduciario(s)',
    enforcerNameAddress: 'Nombre y dirección del Ejecutor',
    protectorNameAddress: 'Nombre y dirección del Protector',
    beneficiary1: 'Nombre y dirección del/los Beneficiario(s)',
    beneficiary2: 'Nombre/número y dirección del Beneficiario 2',
    beneficiary3: 'Nombre/número y dirección del Beneficiario 3',
    beneficiary4: 'Nombre/número y dirección del Beneficiario 4',
    partnershipDocs: 'Adjunte',
    fatcaClassification: 'Clasificación FATCA/CRS',
    fatcaGiin: 'Número GIIN',
    fatcaSponsorGiin: 'Número GIIN del patrocinador',
    fatcaExemptReason: 'Motivo / tipo de exención',
    usEntity: 'A. ¿Es la Entidad una entidad de EE. UU., residente en EE. UU. para fines tributarios, o ha optado por ser tratada como entidad de EE. UU. para fines tributarios?',
    einNumber: 'Número de identificación EI (EIN)',
    otherTaxResidence: 'B. ¿Es la Entidad residente fiscal o está domiciliada en algún otro país?',
    otherTaxResidenceDetails: 'Detalles',
    taxIdNumber: 'Número de identificación tributaria',
    dataConsent: 'Autorización de uso de datos personales',
    declarationName: 'Nombre del representante legal o persona autorizada',
    declarationDate: 'Fecha de la firma 1',
    declarationName2: 'Segunda persona autorizada para firmar (si aplica)',
    declarationDate2: 'Fecha de la firma 2',
  },
  en: {
    panamaEntityName: 'Name/proposed name of Panama entity (Company/ Foundation/ Fund)',
    applicantRoles: 'Applicant is one or more of the following',
    legalName: 'Registered Name of Applicant',
    incorporationDate: 'Date of Incorporation / Formation',
    jurisdiction: 'Jurisdiction of Incorporation/Formation',
    registrationNumber: 'Incorporation /Formation Number',
    registeredAddress: 'Registered Office Address',
    mailingAddress: 'Mailing Address',
    phone: 'Telephone (including area code)',
    businessActivity: 'Description of Business',
    offenceConvicted: 'Has the Applicant at any time been convicted of any criminal offence or been subject to sanctions by a Judicial, Government, Professional or Regulatory body?',
    offenceConvictedDetails: 'Details',
    offenceInvestigation: 'Has the Applicant at any time been the subject of a judicial enquiry/investigation?',
    offenceInvestigationDetails: 'Details',
    applicantType: 'If Applicant is a',
    stockExchange: 'Full name of stock exchange listing',
    tickerSymbol: 'Ticker Symbol',
    regulatedEntity: 'Is it a Regulated Entity or subsidiary of a Regulated Entity?',
    regulatedParentName: 'If Applicant is a Subsidiary of a Regulated Entity, name of Regulated Entity',
    regulatorName: 'Name of Regulator',
    regulatorCountry: 'Country',
    governmentEntity: 'Is it a Government Entity?',
    governmentCountry: 'Country',
    governmentEntityType: 'Type of Govt. Entity',
    privateDocs: 'Please attach',
    privateBankDocs: 'Bank account (in case not having Bank account provide Attorney letter)',
    trustDocs: 'Please attach',
    settlorNameAddress: 'Name and address of Settlor',
    trusteesNameAddress: 'Name and address of Trustee/s',
    enforcerNameAddress: 'Name and address of Enforcer',
    protectorNameAddress: 'Name and address of Protector',
    beneficiary1: 'Name and address of Beneficiary',
    beneficiary2: 'Name/ number and address of Beneficiary 2',
    beneficiary3: 'Name/ number and address of Beneficiary 3',
    beneficiary4: 'Name/ number and address of Beneficiary 4',
    partnershipDocs: 'Please attach',
    fatcaClassification: 'FATCA/CRS Classification',
    fatcaGiin: 'GIIN #',
    fatcaSponsorGiin: 'Sponsors GIIN #',
    fatcaExemptReason: 'Reason/type',
    usEntity: 'A. Is the Entity a US Entity, resident in the US for tax purposes, or has elected to be treated as a US Entity for tax purposes?',
    einNumber: 'EI identification number (EI No)',
    otherTaxResidence: 'B. Is the Entity tax resident in or domiciled in any other country?',
    otherTaxResidenceDetails: 'Details',
    taxIdNumber: 'Tax Identification No',
    dataConsent: 'Authorization for the use of personal data',
    declarationName: 'Name of the legal representative or authorized person',
    declarationDate: 'Date of signature 1',
    declarationName2: 'Second person authorised to sign (if applicable)',
    declarationDate2: 'Date of signature 2',
  },
});

/** Textos guía de la plantilla bajo cada campo. */
const FORM_GUIDES = Object.freeze({
  es: {
    panamaEntityName: 'Sociedad, fundación o fondo panameño respecto del cual se completa este formulario (o el nombre propuesto si aún no se constituye).',
    applicantRoles: 'Marque todas las calidades que tiene el Solicitante respecto de la entidad panameña.',
    legalName: 'Nombre legal completo de la sociedad, fideicomiso o sociedad de personas que actúa como Solicitante, tal como consta en su registro.',
    incorporationDate: 'Formato dd/mm/aaaa.',
    registrationNumber: 'Número de registro asignado al constituirse.',
    registeredAddress: 'Debe coincidir con los documentos de registro.',
    mailingAddress: 'Solo si es distinta de la dirección registrada.',
    phone: 'Incluya el código de país y de área.',
    businessActivity: 'Describa la actividad principal del Solicitante.',
    offenceConvictedDetails: 'Por favor proporcione detalles.',
    offenceInvestigationDetails: 'Por favor proporcione detalles.',
    applicantType: 'Seleccione el tipo de Solicitante y complete solo la sección que corresponde.',
    privateDocs: 'Nota: los Formularios de Cumplimiento y documentos KYC deben presentarse para todos los Directores, Miembros y todos los Accionistas y Beneficiarios Finales que posean el 10% o más del total de acciones ordinarias emitidas de la Empresa Privada.',
    privateBankDocs: 'Marque al menos uno: el estado o certificado bancario, o, si la empresa no tiene cuenta bancaria, la carta de referencia de un abogado o contador.',
    trustDocs: 'Nota: los Formularios de Cumplimiento y documentos KYC deben presentarse para todas las partes indicadas en esta sección.',
    enforcerNameAddress: 'Si lo hay.',
    protectorNameAddress: 'Si lo hay.',
    beneficiary1: 'Si hay varios beneficiarios, escriba uno por línea con su nombre y dirección.',
    fatcaGiin: 'Si es FFI registrada, indique el número GIIN.',
    fatcaSponsorGiin: 'Si es FFI patrocinada, indique el número GIIN del patrocinador.',
    fatcaExemptReason: 'Si es FFI exenta, indique el motivo o tipo.',
    einNumber: 'En caso afirmativo, proporcione el número de identificación EI.',
    otherTaxResidenceDetails: 'En caso afirmativo, proporcione detalles.',
    dataConsent: 'Lea el texto y marque la casilla para autorizar el uso de los datos. Es obligatorio para terminar el formulario.',
    declarationName: 'Nombre completo del representante legal o de la persona autorizada. Se imprime en el PDF sobre los recuadros de firma.',
    declarationName2: 'Solo si firma una segunda persona autorizada.',
    declarationDate: 'Fecha en que firma la primera persona autorizada para firmar en nombre del Solicitante (dd/mm/aaaa).',
    declarationDate2: 'Fecha en que firma la segunda persona autorizada, si corresponde.',
  },
  en: {
    panamaEntityName: 'Panama company, foundation or fund for which this form is completed (or the proposed name if not yet incorporated).',
    applicantRoles: 'Tick every capacity the Applicant holds in the Panama entity.',
    legalName: 'Full legal name of the company, trust or partnership acting as Applicant, as registered.',
    incorporationDate: 'Format dd/mm/yyyy.',
    registrationNumber: 'Registration number assigned on incorporation/formation.',
    registeredAddress: 'Must match the registration documents.',
    mailingAddress: 'Only if different from the registered office address.',
    phone: 'Include country and area code.',
    businessActivity: 'Describe the Applicant’s main business.',
    offenceConvictedDetails: 'If so, please provide details.',
    offenceInvestigationDetails: 'If so, please provide details.',
    applicantType: 'Select the type of Applicant and complete only the matching section.',
    privateDocs: 'Note: Compliance Forms and KYC Documents must be submitted for all Directors, Members and all Shareholders and Ultimate Beneficial Owners holding 10% or greater of the total issued ordinary shares of the Private Company.',
    privateBankDocs: 'Tick at least one: the bank statement or certificate or, if the company has no bank account, the attorney or accountant reference letter.',
    trustDocs: 'Note: Compliance Forms and KYC Documents must be submitted for all parties listed in this section.',
    enforcerNameAddress: 'If any.',
    protectorNameAddress: 'If any.',
    beneficiary1: 'If there are several beneficiaries, write one per line with name and address.',
    fatcaGiin: 'If Registered FFI, please list the GIIN #.',
    fatcaSponsorGiin: 'If Sponsored FFI, please list the Sponsors GIIN #.',
    fatcaExemptReason: 'If Exempt FFI, please list the Reason/type.',
    einNumber: 'If so, please provide the EI identification number.',
    otherTaxResidenceDetails: 'If yes, provide details.',
    dataConsent: 'Read the text and tick the box to authorize the use of the data. Required to finish the form.',
    declarationName: 'Full name of the legal representative or authorized person. Printed in the PDF above the signature boxes.',
    declarationName2: 'Only if a second authorised person signs.',
    declarationDate: 'Date signed by the first person authorised to sign for and on behalf of the Applicant (dd/mm/yyyy).',
    declarationDate2: 'Date signed by the second authorised person, if applicable.',
  },
});

const SECTIONS = Object.freeze([
  {
    sectionKey: 'sectionEntity',
    stepId: 'entity',
    titleEs: 'I. Solicitante',
    titleEn: 'I. Applicant',
    fieldKeys: Object.freeze([
      'panamaEntityName', 'applicantRoles', 'legalName', 'incorporationDate', 'jurisdiction', 'registrationNumber',
      'registeredAddress', 'mailingAddress', 'phone', 'businessActivity',
      'offenceConvicted', 'offenceConvictedDetails', 'offenceInvestigation', 'offenceInvestigationDetails',
    ]),
  },
  {
    sectionKey: 'sectionApplicantType',
    stepId: 'applicantType',
    titleEs: 'II. Tipo de solicitante y documentos',
    titleEn: 'II. Applicant type and documents',
    fieldKeys: Object.freeze([
      'applicantType', 'stockExchange', 'tickerSymbol',
      'regulatedEntity', 'regulatedParentName', 'regulatorName', 'regulatorCountry',
      'governmentEntity', 'governmentCountry', 'governmentEntityType',
      'privateDocs', 'privateBankDocs',
      'trustDocs', 'settlorNameAddress', 'trusteesNameAddress', 'enforcerNameAddress', 'protectorNameAddress',
      'beneficiary1',
    ]),
  },
  {
    sectionKey: 'sectionTax',
    stepId: 'tax',
    titleEs: 'III. Clasificación FATCA/CRS y residencia fiscal',
    titleEn: 'III. FATCA/CRS classification and tax residency',
    fieldKeys: Object.freeze([
      'fatcaClassification', 'fatcaGiin', 'fatcaSponsorGiin', 'fatcaExemptReason',
      'usEntity', 'einNumber', 'otherTaxResidence', 'otherTaxResidenceDetails', 'taxIdNumber',
    ]),
  },
  {
    sectionKey: 'sectionDeclaration',
    stepId: 'declaration',
    titleEs: 'IV. Autorización y firmas',
    titleEn: 'IV. Authorization and signatures',
    fieldKeys: Object.freeze(['dataConsent', 'declarationName', 'declarationDate', 'declarationName2', 'declarationDate2']),
  },
]);

const KYCE_ALL_FIELD_KEYS = Object.freeze(SECTIONS.flatMap((s) => s.fieldKeys));

/** Claves del formato anterior: ya no se capturan, se conservan en los datos guardados. */
const LEGACY_FIELD_KEYS = Object.freeze([
  'tradeName', 'entityType', 'taxId', 'email', 'city', 'country', 'website',
  'legalRepName', 'legalRepId', 'legalRepNationality', 'beneficialOwners',
  'pep', 'pepDetails', 'fundsSource', 'fundsOther',
  // Formato 2026-10 (antes de la plantilla 2026-11)
  'beneficiary2', 'beneficiary3', 'beneficiary4', 'partnershipDocs',
]);

/** Respuestas Sí/No → campos de detalle que se limpian al responder "No". */
const YES_NO_DETAILS = Object.freeze({
  offenceConvicted: ['offenceConvictedDetails'],
  offenceInvestigation: ['offenceInvestigationDetails'],
  usEntity: ['einNumber'],
  otherTaxResidence: ['otherTaxResidenceDetails', 'taxIdNumber'],
});

// ── Validación (misma regla en formulario y servidor) ───────────────────────
const filled = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '');
const condMet = (cond, data) => !cond || String(data[cond.field] || '') === cond.value;

function isShown(key, data = {}) {
  return condMet(FIELDS[key]?.showIf, data);
}

function missingFieldsForStep(step, data = {}) {
  const section = SECTIONS[step - 1];
  if (!section) return [];
  const missing = [];
  for (const key of section.fieldKeys) {
    const def = FIELDS[key];
    if (!isShown(key, data)) continue;
    if (def.required && !filled(data[key])) missing.push(key);
    if (def.type === 'checkboxGroup') {
      const selected = Array.isArray(data[key]) ? data[key] : [];
      for (const opt of def.options) {
        if (opt.required && !selected.includes(opt.key)) missing.push(`${key}.${opt.key}`);
      }
    }
  }
  return [...new Set(missing)];
}

function missingFields(data = {}) {
  return SECTIONS.flatMap((_, i) => missingFieldsForStep(i + 1, data));
}

/** Tipo de solicitante propuesto para trámites del formato anterior. */
function legacyApplicantType(entityType = '') {
  const s = String(entityType).toLowerCase();
  if (!s) return '';
  if (s.includes('fundaci') || s.includes('trust') || s.includes('fideicom')) return 'trustFoundation';
  if (s.includes('s.a') || s.includes('r.l') || s.includes('llc')) return 'privateCompany';
  return '';
}

const NOTES_EN = Object.freeze([
  'The Certified Documents must be certified as true and correct copies of the original documents by a notary public, judicial officer, consulate, lawyer or banker. The name, signature, position and contact details (address, phone number and e-mail) of the Certifier must be clearly stated on each of the certified documents.',
  'The Certifier of the documents must state: “I certify this to be a true copy of the original document which I have seen, and that the photograph shown is a true likeness of the person named therein”.',
  'The date of the certification must be no older than 6 months except in the case of a utility bill which must be no older than 3 months.',
  'It is very important that you obtain independent legal and tax advice to ensure compliance with all applicable tax and other laws.',
]);

const NOTES_ES = Object.freeze([
  'Los Documentos Certificados deben ser certificados como copias fieles y exactas de los documentos originales por un notario público, funcionario judicial, consulado, abogado o banquero. El nombre, firma, cargo y datos de contacto (dirección, número de teléfono y correo electrónico) del Certificador deben constar claramente en cada uno de los documentos certificados.',
  'El Certificador de los documentos debe declarar: “Certifico que esta es una copia fiel del documento original que he tenido a la vista, y que la fotografía mostrada corresponde fielmente a la persona nombrada en él”.',
  'La fecha de la certificación no debe tener más de 6 meses de antigüedad, excepto en el caso de una planilla de servicios básicos, que no debe tener más de 3 meses.',
  'Es muy importante que obtenga asesoría legal y tributaria independiente para asegurar el cumplimiento de todas las leyes tributarias y demás leyes aplicables.',
]);

module.exports = {
  YES,
  NO,
  YES_NO,
  APPLICANT_ROLE_OPTIONS,
  APPLICANT_TYPE_OPTIONS,
  LEGACY_APPLICANT_TYPE_OPTIONS,
  PRIVATE_DOC_OPTIONS,
  PRIVATE_BANK_DOC_OPTIONS,
  LEGACY_PRIVATE_DOC_OPTIONS,
  TRUST_DOC_OPTIONS,
  DATA_CONSENT_TEXT,
  PARTNERSHIP_DOC_OPTIONS,
  FATCA_OPTIONS,
  FIELDS,
  FORM_LABELS,
  FORM_GUIDES,
  SECTIONS,
  KYCE_ALL_FIELD_KEYS,
  LEGACY_FIELD_KEYS,
  YES_NO_DETAILS,
  NOTES_EN,
  NOTES_ES,
  isShown,
  missingFieldsForStep,
  missingFields,
  legacyApplicantType,
};
