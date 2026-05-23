'use strict';

const kyciMaster = require('../../lib/kyciMasterSpec.cjs');

const ES = Object.freeze({
  docTitle: 'PTL_KYC — Formulario de Cumplimiento — Personas Naturales',
  docSubtitle: 'Compliance Form — Individuals',
  sectionPersonal: kyciMaster.SECTIONS[0].titleEs,
  sectionContact: kyciMaster.SECTIONS[1].titleEs,
  sectionCompliance: kyciMaster.SECTIONS[2].titleEs,
  sectionDeclaration: kyciMaster.SECTIONS[3].titleEs,
  sectionPersonalGuide:
    'Complete los datos personales tal como figuran en su pasaporte o documento de identidad oficial.',
  sectionContactGuide: 'Indique datos de contacto vigentes y su ocupación o actividad económica principal.',
  sectionComplianceGuide:
    'Declare si es persona expuesta políticamente (PEP) y marque todas las fuentes que apliquen al origen de sus fondos o patrimonio.',
  sectionDeclarationGuide:
    'Firme y fecha la declaración con el mismo nombre que figura en su documento de identidad.',
  ...kyciMaster.FIELD_LABELS_ES,
  fundsBienes: 'Bienes personales / Personal assets',
  fundsInversiones: 'Inversiones financieras / Financial investments',
  fundsNegocios: 'Negocios / Business activities',
  fundsPrestamos: 'Préstamos / Loans',
  fundsHerencia: 'Herencia o fondo fiduciario / Inheritance or trust fund',
  yes: 'Sí / Yes',
  no: 'No',
});

const EN = Object.freeze({
  docTitle: 'PTL_KYC — Compliance Form — Individuals',
  docSubtitle: 'Formulario de Cumplimiento — Personas Naturales',
  sectionPersonal: kyciMaster.SECTIONS[0].titleEn,
  sectionContact: kyciMaster.SECTIONS[1].titleEn,
  sectionCompliance: kyciMaster.SECTIONS[2].titleEn,
  sectionDeclaration: kyciMaster.SECTIONS[3].titleEn,
  sectionPersonalGuide:
    'Enter personal details exactly as shown on your passport or official ID document.',
  sectionContactGuide: 'Provide current contact details and your main occupation or economic activity.',
  sectionComplianceGuide:
    'State whether you are a politically exposed person (PEP) and check all applicable sources of funds or wealth.',
  sectionDeclarationGuide:
    'Sign and date using the same name as on your official identification document.',
  ...kyciMaster.FIELD_LABELS_EN,
  fundsBienes: 'Personal assets / Bienes personales',
  fundsInversiones: 'Financial investments / Inversiones financieras',
  fundsNegocios: 'Business activities / Negocios',
  fundsPrestamos: 'Loans / Préstamos',
  fundsHerencia: 'Inheritance or trust fund / Herencia o fondo fiduciario',
  yes: 'Yes / Sí',
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
