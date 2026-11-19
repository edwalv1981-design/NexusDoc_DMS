/**
 * Avance de un trámite: en qué paso se quedó el usuario y qué pasos tienen datos.
 *
 * - Desde esta versión los formularios guardan data.__progress
 *   { step, totalSteps, finished, savedAt } (lo normaliza el servidor).
 * - Para trámites guardados antes, el paso se estima por los datos presentes.
 */

const has = (v) => v !== undefined && v !== null && String(v).trim() !== '';
const arr = (v) => (Array.isArray(v) ? v : []);
const anyName = (list, keys = ['fullName', 'companyName', 'name', 'shareholder']) =>
  arr(list).filter((p) => p && keys.some((k) => has(p[k]))).length;

// complete(d): el paso cumple lo mínimo; started(d): el usuario escribió algo.
const DEFS = {
  corporacion: [
    { es: 'Información de la Sociedad', en: 'Company Information',
      complete: (d) => (has(d.corpNameSA) || has(d.corpNameCorp) || has(d.corpNameInc)) && has(d.companyActivities),
      started: (d) => has(d.corpNameSA) || has(d.corpNameCorp) || has(d.corpNameInc) || has(d.companyActivities) },
    { es: 'Junta Directiva', en: 'Board of Directors',
      complete: (d) => anyName(d.directors) >= 3, started: (d) => anyName(d.directors) > 0 },
    { es: 'Dignatarios', en: 'Officers',
      complete: (d) => arr(d.dignitaries).length > 0 && anyName(d.dignitaries) === arr(d.dignitaries).length,
      started: (d) => anyName(d.dignitaries) > 0 },
    { es: 'Accionistas', en: 'Shareholders',
      complete: (d) => anyName(d.shareholders) > 0, started: (d) => anyName(d.shareholders) > 0 },
    { es: 'Declaración Jurada', en: 'Sworn Declaration',
      complete: (d) => arr(d.signers).some((s) => has(s?.name)), started: (d) => arr(d.signers).some((s) => has(s?.name) || has(s?.signature)) },
  ],
  fundacion: [
    { es: 'Nombre de la Fundación', en: 'Foundation Name',
      complete: (d) => has(d.foundationNameOption1), started: (d) => has(d.foundationNameOption1) || has(d.foundationNameOption2) || has(d.foundationNameOption3) },
    { es: 'Capital Social', en: 'Initial Endowment', complete: (d) => has(d.initialPatrimony), started: (d) => has(d.initialPatrimony) },
    { es: 'Fundadores', en: 'Founders', complete: (d) => anyName(d.founders) > 0, started: (d) => anyName(d.founders) > 0 },
    { es: 'Protectores', en: 'Protectors', complete: (d) => anyName(d.protectors) > 0, started: (d) => anyName(d.protectors) > 0 },
    { es: 'Miembros (Consejo)', en: 'Members (Council)', complete: (d) => anyName(d.councilMembers) >= 3, started: (d) => anyName(d.councilMembers) > 0 },
    { es: 'Dignatarios', en: 'Dignitaries',
      complete: (d) => arr(d.dignitaries).length > 0 && anyName(d.dignitaries) === arr(d.dignitaries).length, started: (d) => anyName(d.dignitaries) > 0 },
    { es: 'Beneficiarios', en: 'Beneficiaries', complete: (d) => anyName(d.beneficiaries) > 0, started: (d) => anyName(d.beneficiaries) > 0 },
    { es: 'Poder (POA)', en: 'Power of Attorney',
      complete: (d) => d.poaIssue === 'NO' || (d.poaIssue === 'YES' && has(d.poaFullName)), started: (d) => d.poaIssue === 'YES' || has(d.poaFullName) },
    { es: 'Actividades de la Fundación', en: 'Foundation Activities', complete: (d) => has(d.foundationObjects), started: (d) => has(d.foundationObjects) },
    { es: 'Declaración y Firmas', en: 'Declaration & Signatures',
      complete: (d) => arr(d.signers).some((s) => has(s?.name)), started: (d) => arr(d.signers).some((s) => has(s?.name) || has(s?.signature)) },
  ],
  kyci: [
    { es: 'Solicitante', en: 'Applicant',
      complete: (d) => (has(d.firstName) && has(d.lastName) || has(d.fullName)) && ['birthDate', 'nationality', 'birthPlace', 'passport', 'address', 'phone', 'email'].every((k) => has(d[k])),
      started: (d) => ['panamaEntityName', 'firstName', 'lastName', 'fullName', 'birthDate', 'passport', 'idCard'].some((k) => has(d[k])) || arr(d.applicantRoles).length > 0 },
    { es: 'Residencia fiscal y FATCA', en: 'Tax residency & FATCA',
      complete: (d) => has(d.taxResidenceCountries) && has(d.otherTaxResidence) && has(d.usPerson),
      started: (d) => ['taxResidenceCountries', 'otherTaxResidence', 'usPerson', 'city', 'country', 'occupation'].some((k) => has(d[k])) },
    { es: 'Patrimonio, PEP y sanciones', en: 'Wealth, PEP & offences',
      complete: (d) => (has(d.sourceOfWealth) || arr(d.fundsSource).length > 0) && has(d.pep) && (d.pep !== 'Sí' || has(d.pepDetails)),
      started: (d) => has(d.sourceOfWealth) || arr(d.fundsSource).length > 0 || has(d.fundsOther) || d.pep === 'Sí' || has(d.offenceConvicted) },
    { es: 'Documentos y declaración', en: 'Documents & declaration',
      complete: (d) => arr(d.certifiedDocs).length > 0 || has(d.declarationName),
      started: (d) => arr(d.certifiedDocs).length > 0 || has(d.declarationName) },
  ],
  kyce: [
    { es: 'Solicitante', en: 'Applicant',
      complete: (d) => ['legalName', 'incorporationDate', 'jurisdiction', 'registrationNumber', 'registeredAddress', 'phone', 'businessActivity'].every((k) => has(d[k])) && has(d.offenceConvicted) && has(d.offenceInvestigation),
      started: (d) => ['panamaEntityName', 'legalName', 'incorporationDate', 'jurisdiction', 'taxId', 'registeredAddress'].some((k) => has(d[k])) },
    { es: 'Tipo de solicitante y documentos', en: 'Applicant type & documents',
      complete: (d) => has(d.applicantType),
      started: (d) => has(d.applicantType) || has(d.entityType) || has(d.legalRepName) },
    { es: 'FATCA/CRS y residencia fiscal', en: 'FATCA/CRS & tax residency',
      complete: (d) => has(d.fatcaClassification) && has(d.usEntity) && has(d.otherTaxResidence),
      started: (d) => has(d.fatcaClassification) || has(d.usEntity) || has(d.otherTaxResidence) || has(d.pep) || arr(d.fundsSource).length > 0 },
    { es: 'Declaración y firmas', en: 'Declaration & signatures',
      complete: (d) => has(d.declarationDate) && (has(d.fatcaClassification) || has(d.declarationName)),
      started: (d) => has(d.declarationName) || has(d.fatcaClassification) },
  ],
  fondos: [
    { es: 'Identificación Corporativa', en: 'Corporate Identification',
      complete: (d) => ['companyName', 'country', 'activities', 'beneficiaryName', 'birthDate', 'birthPlace', 'address'].every((k) => has(d[k])),
      started: (d) => ['companyName', 'country', 'activities', 'beneficiaryName', 'birthDate', 'birthPlace', 'address'].some((k) => has(d[k])) },
    { es: 'Origen de Fondos', en: 'Source of Funds', complete: (d) => arr(d.fundsSource).length > 0, started: (d) => arr(d.fundsSource).length > 0 || has(d.fundsOther) },
    { es: 'Registro y Responsabilidades', en: 'Registry & Responsibilities',
      complete: (d) => ['custodyName', 'custodyPhone', 'custodyEmail', 'custodyAddress', 'signerName', 'date'].every((k) => has(d[k])),
      started: (d) => ['custodyName', 'custodyPhone', 'custodyEmail', 'custodyAddress', 'signerName'].some((k) => has(d[k])) },
  ],
};

/** Clave interna del tipo de formulario a partir del nombre guardado en formType. */
export function formKind(formType = '') {
  const t = String(formType).toLowerCase();
  if (t.startsWith('corporaci') || t.includes('incorporaci')) return 'corporacion';
  if (t.startsWith('fundaci')) return 'fundacion';
  if (t.includes('cumplimiento individual') || t.includes('kyci') || t.includes('individual')) return 'kyci';
  if (t.includes('cumplimiento entidades') || t.includes('kyce') || t.includes('entidad')) return 'kyce';
  if (t.includes('fondos')) return 'fondos';
  return null;
}

export const TOTAL_STEPS = { corporacion: 5, fundacion: 10, kyci: 4, kyce: 4, fondos: 3 };

/** Agrega el progreso al guardar (lo usan los formularios). */
export function withProgress(data, step, totalSteps, finished = false) {
  return { ...data, __progress: { step, totalSteps, finished: Boolean(finished) } };
}

/**
 * @returns {{ kind, totalSteps, steps: {n,label,status}[], completeCount, savedStep, savedStepLabel,
 *            finished: true|false|null, tracked: boolean, savedAt, lastStepWithData }}
 *  status: 'complete' | 'partial' | 'empty'.  finished === null => no registrado (trámite anterior).
 */
export function getFormProgress(formType, data = {}, lang = 'es') {
  const kind = formKind(formType);
  const d = data || {};
  // Trámite llenado con una plantilla subida: sus pasos salen de la plantilla, no del formato estándar.
  if (d.__templateVersion && typeof d.__templateVersion === 'object' && d.__templateVersion.id) {
    const p = d.__progress && typeof d.__progress === 'object' ? d.__progress : {};
    const total = Math.max(Number(p.totalSteps) || 1, 1);
    const saved = Math.min(Math.max(Number(p.step) || 1, 1), total);
    const done = Boolean(p.finished);
    const steps = Array.from({ length: total }, (_, i) => ({
      n: i + 1,
      label: (lang === 'en' ? 'Section ' : 'Sección ') + (i + 1),
      status: done || i + 1 < saved ? 'complete' : i + 1 === saved ? 'partial' : 'empty',
    }));
    return {
      kind: 'template',
      totalSteps: total,
      steps,
      completeCount: steps.filter((s) => s.status === 'complete').length,
      savedStep: saved,
      savedStepLabel: steps[saved - 1].label,
      finished: done,
      tracked: true,
      savedAt: p.savedAt || null,
      lastStepWithData: saved,
      templateVersion: d.__templateVersion.version,
    };
  }
  const defs = DEFS[kind];
  if (!defs) return { kind: null, totalSteps: 0, steps: [], completeCount: 0, savedStep: null, finished: null, tracked: false };

  const steps = defs.map((def, i) => {
    let status = 'empty';
    try {
      if (def.complete(d)) status = 'complete';
      else if (def.started(d)) status = 'partial';
    } catch { status = 'empty'; }
    return { n: i + 1, label: lang === 'en' ? def.en : def.es, status };
  });
  const lastStepWithData = steps.reduce((acc, s) => (s.status !== 'empty' ? s.n : acc), 0);
  const p = d.__progress && typeof d.__progress === 'object' ? d.__progress : null;
  const tracked = Boolean(p && p.step);
  const savedStep = tracked ? Math.min(Number(p.step) || 1, steps.length) : (lastStepWithData || 1);

  return {
    kind,
    totalSteps: steps.length,
    steps,
    completeCount: steps.filter((s) => s.status === 'complete').length,
    savedStep,
    savedStepLabel: steps[savedStep - 1]?.label || '',
    finished: tracked ? Boolean(p.finished) : null,
    tracked,
    savedAt: tracked ? p.savedAt || null : null,
    lastStepWithData,
  };
}

/** Última edición del administrador registrada en el trámite (o null). */
export function lastAdminEdit(data) {
  const log = data && Array.isArray(data.__adminEditLog) ? data.__adminEditLog : [];
  return log.length ? log[log.length - 1] : null;
}
