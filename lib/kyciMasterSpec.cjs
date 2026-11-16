'use strict';

/**
 * KYCI — PTL_KYC "Compliance Form — Individuals" (Customer Due Diligence Procedure).
 * FUENTE ÚNICA de campos, obligatorios, textos y orden del formulario y del PDF.
 * Debe coincidir con la plantilla oficial (3 páginas):
 *
 *   I.   Applicant / Solicitante        (entidad panameña, roles, identidad, contacto)
 *   II.  Tax residency and FATCA        (residencia fiscal, persona de EE. UU.)
 *   III. Source of wealth, PEP, offences
 *   IV.  Certified documents, declaration and signature
 *
 * Compatibilidad: claves anteriores (fullName, idCard, city, country, occupation,
 * employer, fundsSource, fundsOther, declarationName) ya no se piden; los datos
 * guardados se conservan y el PDF usa fullName/fundsSource como respaldo.
 */

const YES = 'Sí';
const NO = 'No';
const YES_NO = Object.freeze([NO, YES]);

const MARITAL_STATUS_OPTIONS = Object.freeze([
  'Soltero(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viudo(a)',
  'Unión libre',
]);

/** "Applicant is one or more of the following" (10 casillas de la plantilla). */
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

/** "Certified identity documents to be attached" (6 casillas). */
const CERTIFIED_DOC_OPTIONS = Object.freeze([
  { key: 'passport', required: true, en: 'Colour Picture Passport; AND', es: 'Pasaporte con fotografía a color; Y' },
  {
    key: 'proofOfAddress',
    required: true,
    en: 'Proof of current address (<3 months old); Utility Bill or Credit Card Statement or Bank Reference; AND',
    es: 'Comprobante de domicilio actual (<3 meses de antigüedad); planilla de servicios básicos, estado de cuenta de tarjeta de crédito o referencia bancaria; Y',
  },
  { key: 'cv', required: true, en: 'CV Details or a link to publicly available biography', es: 'Hoja de vida o un enlace a una biografía disponible públicamente' },
  { key: 'bankReference', en: 'Bank Reference (as may be applicable – see Note 1 below)', es: 'Referencia bancaria (según aplique – ver Nota 1 abajo)' },
  { key: 'professionalReference', en: 'Professional Reference (lawyer, accountant)', es: 'Referencia profesional (abogado, contador)' },
  { key: 'w9', requiredIf: { field: 'usPerson', value: YES }, en: 'W9 (if a US Person or US Tax Resident) (if applicable – see Note 4 below)', es: 'W9 (si es Persona de EE. UU. o residente fiscal en EE. UU.) (si aplica – ver Nota 4 abajo)' },
]);

/** Pares pregunta Sí/No → detalle obligatorio cuando la respuesta es "Sí". */
const YES_NO_DETAILS = Object.freeze({
  otherTaxResidence: 'otherTaxResidenceDetails',
  pep: 'pepDetails',
  offenceConvicted: 'offenceConvictedDetails',
  offenceBankrupt: 'offenceBankruptDetails',
  offenceInvestigation: 'offenceInvestigationDetails',
});

/**
 * Campos en el orden de la plantilla.
 * required: obligatorio; requiredIf/showIf: { field, value } condicional.
 */
const FIELDS = Object.freeze({
  panamaEntityName: { type: 'text', required: true },
  applicantRoles: { type: 'checkboxGroup', required: true, options: APPLICANT_ROLE_OPTIONS },
  firstName: { type: 'text', required: true },
  secondName: { type: 'text' },
  lastName: { type: 'text', required: true },
  birthDate: { type: 'date', required: true },
  nationality: { type: 'text', required: true },
  birthPlace: { type: 'text', required: true },
  passport: { type: 'text', required: true },
  address: { type: 'text', required: true },
  maritalStatus: { type: 'select', required: true, options: MARITAL_STATUS_OPTIONS },
  phone: { type: 'text', required: true },
  email: { type: 'email', required: true },

  taxResidenceCountries: { type: 'text', required: true },
  otherTaxResidence: { type: 'radio', required: true, options: YES_NO },
  otherTaxResidenceDetails: { type: 'textarea', showIf: { field: 'otherTaxResidence', value: YES }, requiredIf: { field: 'otherTaxResidence', value: YES } },
  usPerson: { type: 'radio', required: true, options: YES_NO },
  usTin: { type: 'text', showIf: { field: 'usPerson', value: YES }, requiredIf: { field: 'usPerson', value: YES } },
  usDetails: { type: 'textarea', showIf: { field: 'usPerson', value: YES } },

  sourceOfWealth: { type: 'textarea', required: true },
  pep: { type: 'radio', required: true, options: YES_NO },
  pepDetails: { type: 'textarea', showIf: { field: 'pep', value: YES }, requiredIf: { field: 'pep', value: YES } },
  offenceConvicted: { type: 'radio', required: true, options: YES_NO },
  offenceConvictedDetails: { type: 'textarea', showIf: { field: 'offenceConvicted', value: YES }, requiredIf: { field: 'offenceConvicted', value: YES } },
  offenceBankrupt: { type: 'radio', required: true, options: YES_NO },
  offenceBankruptDetails: { type: 'textarea', showIf: { field: 'offenceBankrupt', value: YES }, requiredIf: { field: 'offenceBankrupt', value: YES } },
  offenceInvestigation: { type: 'radio', required: true, options: YES_NO },
  offenceInvestigationDetails: { type: 'textarea', showIf: { field: 'offenceInvestigation', value: YES }, requiredIf: { field: 'offenceInvestigation', value: YES } },

  certifiedDocs: { type: 'checkboxGroup', required: true, options: CERTIFIED_DOC_OPTIONS },
  declarationDate: { type: 'date', required: true },
});

/** Etiquetas del PDF (bilingües, texto de la plantilla). */
const FIELD_LABELS_EN = Object.freeze({
  panamaEntityName: 'Name/proposed name of the Panama entity / Nombre o nombre propuesto de la entidad panameña',
  applicantRoles: 'Applicant is one or more of the following / El solicitante es',
  firstName: 'First Name / Primer nombre',
  secondName: 'Middle Name / Segundo nombre',
  lastName: 'Surname(s) / Apellido(s)',
  birthDate: 'Date of Birth / Fecha de nacimiento',
  nationality: 'Nationality(ies) / Nacionalidad(es)',
  birthPlace: 'Place of Birth / Lugar de nacimiento',
  passport: 'Passport No / Número de pasaporte',
  address: 'Permanent Residential Address / Dirección residencial permanente',
  maritalStatus: 'Marital Status / Estado civil',
  phone: 'Telephone (include area code) / Teléfono (con código de área)',
  email: 'E-mail address / Correo electrónico',
  taxResidenceCountries: 'In which country(ies) are you resident for tax purposes? / País(es) de residencia fiscal',
  otherTaxResidence: 'Are you resident or domiciled in any other country? / ¿Reside o tiene domicilio en otro país?',
  otherTaxResidenceDetails: 'If yes, provide details / Si es así, detalle',
  usPerson: 'Are you a U.S. Person or resident in the U.S. for tax purposes? (e.g. Green Card holder) / ¿Es persona de EE. UU. o residente fiscal en EE. UU.?',
  usTin: 'TIN (complete a W9) / Número de identificación tributaria (complete un W9)',
  usDetails: 'Details / Detalle',
  sourceOfWealth: 'Source of Wealth / Origen del patrimonio',
  pep: 'Political Connections: Do you or any member of your immediate family hold or previously held a position of a “Politically Exposed Person” (PEP)? / ¿Es usted o un familiar cercano Persona Expuesta Políticamente (PEP)?',
  pepDetails: 'Details including position, responsibility and time frames / Detalle: cargo, responsabilidad y periodo',
  offenceConvicted: '1. Have you at any time been convicted of any criminal offence or been subject to sanctions by a Judicial, Government, Professional or Regulatory body? / ¿Ha sido condenado por un delito o sancionado por un organismo judicial, gubernamental, profesional o regulador?',
  offenceConvictedDetails: 'If so, please provide details / Si es así, detalle',
  offenceBankrupt: '2. Are you or have you been an un-discharged bankruptcy? / ¿Está o ha estado en quiebra no rehabilitada?',
  offenceBankruptDetails: 'If so, please provide details / Si es así, detalle',
  offenceInvestigation: '3. Have you been the subject of a judicial or official enquiry/investigation? / ¿Ha sido objeto de una investigación judicial u oficial?',
  offenceInvestigationDetails: 'If so, please provide details / Si es así, detalle',
  certifiedDocs: 'I hereby attach certified copies of the following documents / Adjunto copias certificadas de los siguientes documentos',
  declarationDate: 'Date (dd/mm/yyyy) / Fecha (dd/mm/aaaa)',
});

const FIELD_LABELS_ES = Object.freeze(
  Object.fromEntries(
    Object.entries(FIELD_LABELS_EN).map(([k, v]) => {
      const [en, es] = String(v).split(' / ').length === 2 ? String(v).split(' / ') : [v, v];
      return [k, `${es} / ${en}`];
    })
  )
);

/** Etiquetas cortas para el formulario (un idioma). */
const FORM_LABELS = Object.freeze({
  es: {
    panamaEntityName: 'Nombre o nombre propuesto de la entidad panameña',
    applicantRoles: 'El solicitante es (marque una o más opciones)',
    firstName: 'Primer nombre', secondName: 'Segundo nombre', lastName: 'Apellido(s)',
    birthDate: 'Fecha de nacimiento', nationality: 'Nacionalidad(es)', birthPlace: 'Lugar de nacimiento',
    passport: 'Número de pasaporte', address: 'Dirección residencial permanente', maritalStatus: 'Estado civil',
    phone: 'Teléfono (con código de área)', email: 'Correo electrónico',
    taxResidenceCountries: '¿En qué país(es) es residente fiscal?',
    otherTaxResidence: '¿Reside o tiene domicilio en algún otro país?', otherTaxResidenceDetails: 'Detalle',
    usPerson: '¿Es persona de EE. UU. o residente fiscal en EE. UU.? (p. ej. titular de Green Card)',
    usTin: 'Número de identificación tributaria (TIN) — complete un formulario W9', usDetails: 'Detalle',
    sourceOfWealth: 'Origen del patrimonio: salarios, propiedad de negocios, etc., con detalle del empleo y/o nombres y actividades de los negocios',
    pep: '¿Usted o algún familiar cercano ocupa u ocupó un cargo de Persona Expuesta Políticamente (PEP)? (p. ej. político, alto funcionario de gobierno o militar)',
    pepDetails: 'Detalle: cargo, responsabilidad y periodo',
    offenceConvicted: '1. ¿Ha sido condenado por algún delito o sancionado por un organismo judicial, gubernamental, profesional o regulador?',
    offenceBankrupt: '2. ¿Está o ha estado en quiebra no rehabilitada?',
    offenceInvestigation: '3. ¿Ha sido objeto de una investigación judicial u oficial?',
    offenceConvictedDetails: 'Detalle', offenceBankruptDetails: 'Detalle', offenceInvestigationDetails: 'Detalle',
    certifiedDocs: 'Adjunto copias certificadas de los siguientes documentos',
    declarationDate: 'Fecha',
  },
  en: {
    panamaEntityName: 'Name/proposed name of the Panama entity',
    applicantRoles: 'Applicant is one or more of the following',
    firstName: 'First Name', secondName: 'Middle Name', lastName: 'Surname(s)',
    birthDate: 'Date of Birth', nationality: 'Nationality(ies)', birthPlace: 'Place of Birth',
    passport: 'Passport No', address: 'Permanent Residential Address', maritalStatus: 'Marital Status',
    phone: 'Telephone (include area code)', email: 'E-mail address',
    taxResidenceCountries: 'In which country(ies) are you resident for tax purposes?',
    otherTaxResidence: 'Are you resident or domiciled in any other country?', otherTaxResidenceDetails: 'Details',
    usPerson: 'Are you a U.S. Person or resident in the U.S. for tax purposes? (e.g. Green Card holder)',
    usTin: 'Tax identification number (TIN) — please complete a W9', usDetails: 'Details',
    sourceOfWealth: 'Source of wealth (e.g. salaries, ownership of business etc) including details of employment and/or business names and activities',
    pep: 'Do you or any member of your immediate family hold or previously held a position of a “Politically Exposed Person” (PEP)? (e.g. Politician, Senior Government or Military Official)',
    pepDetails: 'Details including position, responsibility and time frames',
    offenceConvicted: '1. Have you at any time been convicted of any criminal offence or been subject to sanctions by a Judicial, Government, Professional or Regulatory body?',
    offenceBankrupt: '2. Are you or have you been an un-discharged bankruptcy?',
    offenceInvestigation: '3. Have you been the subject of a judicial or official enquiry/investigation?',
    offenceConvictedDetails: 'Details', offenceBankruptDetails: 'Details', offenceInvestigationDetails: 'Details',
    certifiedDocs: 'I hereby attach certified copies of the following documents',
    declarationDate: 'Date',
  },
});

/** Textos guía de la plantilla, bajo cada campo del formulario. */
const FORM_GUIDES = Object.freeze({
  es: {
    panamaEntityName: 'Indique el nombre de la sociedad, fundación u otra entidad panameña (o el nombre propuesto si aún no se constituye).',
    applicantRoles: 'Marque todas las calidades que tiene respecto de la entidad panameña. Accionista: posee o propone poseer, directa o indirectamente, el 10% o más del capital social.',
    firstName: 'Tal como aparece en su pasaporte.',
    lastName: 'Tal como aparecen en su pasaporte.',
    birthDate: 'Formato dd/mm/aaaa.',
    nationality: 'Si tiene más de una nacionalidad, indíquelas todas.',
    passport: 'Debe coincidir con la copia certificada del pasaporte que adjunta.',
    address: 'Dirección completa donde reside de forma permanente (no apartado postal). Debe coincidir con el comprobante de domicilio.',
    phone: 'Incluya el código de país y de área.',
    taxResidenceCountries: 'Nota: por favor complete la Declaración Tributaria de Autocertificación Individual (si aplica).',
    otherTaxResidenceDetails: 'Indique el país y el motivo de la residencia o domicilio.',
    usPerson: 'Ley de Cumplimiento Tributario de Cuentas Extranjeras (FATCA). Incluye a ciudadanos estadounidenses y titulares de Green Card.',
    usTin: 'En caso afirmativo, complete un formulario W9 e indique el número de identificación tributaria (TIN).',
    sourceOfWealth: 'Proporcione detalles sobre el origen del patrimonio (p. ej. salarios, propiedad de negocios, etc.), incluyendo detalles del empleo y/o nombres y actividades de los negocios.',
    pep: 'Ejemplos: político, alto funcionario de gobierno o militar, etc. Aplica también si se trata de un miembro de su familia inmediata.',
    pepDetails: 'Incluya el cargo, la responsabilidad y los períodos.',
    offenceConvictedDetails: 'Por favor proporcione detalles.',
    offenceBankruptDetails: 'Por favor proporcione detalles.',
    offenceInvestigationDetails: 'Por favor proporcione detalles.',
    certifiedDocs: 'Estos documentos deben estar certificados como copias fieles y exactas de los documentos originales por un profesional independiente (ver las Notas). Se debe enviar además una copia original del Formulario de Cumplimiento firmado junto con los documentos de debida diligencia.',
    declarationDate: 'Fecha en que firma el formulario (dd/mm/aaaa).',
  },
  en: {
    panamaEntityName: 'State the name of the Panama company, foundation or other entity (or the proposed name if not yet incorporated).',
    applicantRoles: 'Tick every capacity you hold in the Panama entity. Shareholder: owns or proposes owning, directly or indirectly, 10% or greater of the share capital.',
    firstName: 'As shown in your passport.',
    lastName: 'As shown in your passport.',
    birthDate: 'Format dd/mm/yyyy.',
    nationality: 'If you hold more than one nationality, list them all.',
    passport: 'Must match the certified passport copy you attach.',
    address: 'Full permanent residential address (not a P.O. Box). Must match the proof of address.',
    phone: 'Include country and area code.',
    taxResidenceCountries: 'Note: Please complete the Individual Self Certification Tax Declaration (If applicable).',
    otherTaxResidenceDetails: 'State the country and the reason for the residence or domicile.',
    usPerson: 'Foreign Account Tax Compliance Act (FATCA). Includes U.S. citizens and Green Card holders.',
    usTin: 'In the affirmative, please complete a W9 and provide the relevant tax identification number (TIN).',
    sourceOfWealth: 'Provide details regarding source of wealth (e.g. salaries, ownership of business etc) including details of employment and/or business names and activities.',
    pep: 'e.g. Politician, Senior Government or Military Official etc. Also applies to any member of your immediate family.',
    pepDetails: 'Include position, responsibility and time frames.',
    offenceConvictedDetails: 'Please provide details.',
    offenceBankruptDetails: 'Please provide details.',
    offenceInvestigationDetails: 'Please provide details.',
    certifiedDocs: 'These documents must be certified as true and correct copies of the original documents by a third party professional (see Notes). An original copy of the executed Compliance Form must be sent together with the due diligence documents.',
    declarationDate: 'Date you sign the form (dd/mm/yyyy).',
  },
});

const SECTIONS = Object.freeze([
  {
    sectionKey: 'sectionPersonal',
    stepId: 'personal',
    titleEs: 'I. Solicitante',
    titleEn: 'I. Applicant',
    fieldKeys: Object.freeze([
      'panamaEntityName', 'applicantRoles', 'firstName', 'secondName', 'lastName', 'birthDate',
      'nationality', 'birthPlace', 'passport', 'address', 'maritalStatus', 'phone', 'email',
    ]),
  },
  {
    sectionKey: 'sectionContact',
    stepId: 'contact',
    titleEs: 'II. Residencia fiscal y FATCA',
    titleEn: 'II. Tax residency and FATCA',
    fieldKeys: Object.freeze(['taxResidenceCountries', 'otherTaxResidence', 'otherTaxResidenceDetails', 'usPerson', 'usTin', 'usDetails']),
  },
  {
    sectionKey: 'sectionCompliance',
    stepId: 'compliance',
    titleEs: 'III. Origen del patrimonio, PEP y sanciones',
    titleEn: 'III. Source of wealth, PEP and offences',
    fieldKeys: Object.freeze([
      'sourceOfWealth', 'pep', 'pepDetails',
      'offenceConvicted', 'offenceConvictedDetails',
      'offenceBankrupt', 'offenceBankruptDetails',
      'offenceInvestigation', 'offenceInvestigationDetails',
    ]),
  },
  {
    sectionKey: 'sectionDeclaration',
    stepId: 'declaration',
    titleEs: 'IV. Documentos certificados, declaración y firma',
    titleEn: 'IV. Certified documents, declaration and signature',
    fieldKeys: Object.freeze(['certifiedDocs', 'declarationDate']),
  },
]);

const KYCI_ALL_FIELD_KEYS = Object.freeze(SECTIONS.flatMap((s) => s.fieldKeys));
const DATE_FIELD_KEYS = new Set(['birthDate', 'declarationDate']);

const REQUIRED_BY_STEP = Object.freeze(
  Object.fromEntries(SECTIONS.map((s) => [s.stepId, s.fieldKeys.filter((k) => FIELDS[k].required)]))
);

// ── Validación (misma regla en formulario y servidor) ───────────────────────
const filled = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '');
const condMet = (cond, data) => Boolean(cond) && String(data[cond.field] || '') === cond.value;

/** Claves que faltan en un paso (1..4) según los obligatorios de la plantilla. */
function missingFieldsForStep(step, data = {}) {
  const section = SECTIONS[step - 1];
  if (!section) return [];
  const missing = [];
  for (const key of section.fieldKeys) {
    const def = FIELDS[key];
    const needed = def.required || condMet(def.requiredIf, data);
    if (needed && !filled(data[key])) missing.push(key);
    if (key === 'certifiedDocs') {
      const selected = Array.isArray(data.certifiedDocs) ? data.certifiedDocs : [];
      for (const opt of CERTIFIED_DOC_OPTIONS) {
        const req = opt.required || condMet(opt.requiredIf, data);
        if (req && !selected.includes(opt.key)) missing.push(`certifiedDocs.${opt.key}`);
      }
    }
  }
  return [...new Set(missing)];
}

function missingFields(data = {}) {
  return SECTIONS.flatMap((_, i) => missingFieldsForStep(i + 1, data));
}

/** Nombre completo para compatibilidad (búsquedas, catálogo, listados). */
function computeFullName(data = {}) {
  const parts = [data.firstName, data.secondName, data.lastName].map((p) => String(p || '').trim()).filter(Boolean);
  return parts.length ? parts.join(' ') : String(data.fullName || '').trim();
}

/** Formularios antiguos con solo fullName: propone primer nombre / segundo nombre / apellidos. */
function splitLegacyFullName(fullName = '') {
  const tokens = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return { firstName: '', secondName: '', lastName: '' };
  if (tokens.length === 1) return { firstName: tokens[0], secondName: '', lastName: '' };
  if (tokens.length === 2) return { firstName: tokens[0], secondName: '', lastName: tokens[1] };
  if (tokens.length === 3) return { firstName: tokens[0], secondName: '', lastName: tokens.slice(1).join(' ') };
  return { firstName: tokens[0], secondName: tokens[1], lastName: tokens.slice(2).join(' ') };
}

// Opciones anteriores de "origen de fondos" (solo para mostrar datos antiguos).
const FUNDS_SOURCE_OPTIONS = Object.freeze([
  { key: 'Bienes personales', labelKey: 'bienes', pdfCheckboxKey: 'bienes' },
  { key: 'Inversiones Financieras', labelKey: 'inversiones', pdfCheckboxKey: 'inversiones' },
  { key: 'Negocios', labelKey: 'negocios', pdfCheckboxKey: 'negocios' },
  { key: 'Prestamos', labelKey: 'prestamos', pdfCheckboxKey: 'prestamos' },
  { key: 'Herencia o Fondo Fiduciario', labelKey: 'herencia', pdfCheckboxKey: 'herencia' },
  { key: 'Otras formas de ingresos', labelKey: 'otras', pdfCheckboxKey: 'otras' },
]);

/** Origen del patrimonio para formularios antiguos (casillas + ocupación/empleador). */
function legacySourceOfWealth(data = {}) {
  const parts = [];
  if (Array.isArray(data.fundsSource) && data.fundsSource.length) parts.push(data.fundsSource.join(', '));
  if (filled(data.fundsOther)) parts.push(String(data.fundsOther));
  const job = [data.occupation, data.employer].filter(filled).join(' — ');
  if (job) parts.push(job);
  return parts.join('. ');
}

/** Claves del formato anterior: ya no se capturan, se conservan en datos guardados. */
const LEGACY_FIELD_KEYS = Object.freeze([
  'fullName', 'idCard', 'city', 'country', 'occupation', 'employer',
  'fundsSource', 'fundsOther', 'declarationName',
]);

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
  MARITAL_STATUS_OPTIONS,
  APPLICANT_ROLE_OPTIONS,
  CERTIFIED_DOC_OPTIONS,
  YES_NO_DETAILS,
  FIELDS,
  FIELD_LABELS_ES,
  FIELD_LABELS_EN,
  FORM_LABELS,
  FORM_GUIDES,
  SECTIONS,
  KYCI_ALL_FIELD_KEYS,
  DATE_FIELD_KEYS,
  REQUIRED_BY_STEP,
  NOTES_EN,
  NOTES_ES,
  LEGACY_FIELD_KEYS,
  FUNDS_SOURCE_OPTIONS,
  missingFieldsForStep,
  missingFields,
  computeFullName,
  splitLegacyFullName,
  legacySourceOfWealth,
};
