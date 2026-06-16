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
    'This form is for completion by each individual (the “Applicant”) who: owns or proposes owning 10% or greater of share capital (Shareholder), is a Beneficial Owner, is a Director, General Partner, Authorised Signatory, Power of Attorney, Settlor, Enforcer, or Protector. Note that an original copy of the executed Compliance Form must be sent to us together with the due diligence documents.',
  sectionContactGuide: 'In which country(ies) are you resident for tax purposes? Note: Please complete the Individual Self Certification Tax Declaration (If applicable). Foreign Account Tax Compliance Act – U.S Status and Connections: Are you a U.S. Person or resident in the U.S. for tax purposes? (e.g. Green Card holder)',
  sectionComplianceGuide:
    'Source of Wealth: Provide details regarding source of wealth (e.g. salaries, ownership of business etc) including details of employment and/or business names and activities.\nPolitical Connections: Do you or any member of your immediate family hold or previously held a position of a “Politically Exposed Person” (PEP)?\nOffences/Sanctions: Have you at any time been convicted of any criminal offence, been an un-discharged bankruptcy, or subject of an official enquiry?',
  sectionDeclarationGuide:
    'CERTIFIED IDENTITY DOCUMENTS TO BE ATTACHED: I hereby attach certified copies of the following documents: Colour Picture Passport; AND Proof of current address (<3 months old); Utility Bill or Credit Card Statement or Bank Reference; AND CV Details or a link to publicly available biography. These documents must be certified as true and correct copies... I hereby confirm that the above details are true and accurate and I undertake to advise you in the event that any of my circumstances change within 14 days of those changes occurring.',
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
    'This form is for completion by each individual (the “Applicant”) who: owns or proposes owning 10% or greater of share capital (Shareholder), is a Beneficial Owner, is a Director, General Partner, Authorised Signatory, Power of Attorney, Settlor, Enforcer, or Protector. Note that an original copy of the executed Compliance Form must be sent to us together with the due diligence documents.',
  sectionContactGuide: 'In which country(ies) are you resident for tax purposes? Note: Please complete the Individual Self Certification Tax Declaration (If applicable). Foreign Account Tax Compliance Act – U.S Status and Connections: Are you a U.S. Person or resident in the U.S. for tax purposes? (e.g. Green Card holder)',
  sectionComplianceGuide:
    'Source of Wealth: Provide details regarding source of wealth (e.g. salaries, ownership of business etc) including details of employment and/or business names and activities.\nPolitical Connections: Do you or any member of your immediate family hold or previously held a position of a “Politically Exposed Person” (PEP)?\nOffences/Sanctions: Have you at any time been convicted of any criminal offence, been an un-discharged bankruptcy, or subject of an official enquiry?',
  sectionDeclarationGuide:
    'CERTIFIED IDENTITY DOCUMENTS TO BE ATTACHED: I hereby attach certified copies of the following documents: Colour Picture Passport; AND Proof of current address (<3 months old); Utility Bill or Credit Card Statement or Bank Reference; AND CV Details or a link to publicly available biography. These documents must be certified as true and correct copies... I hereby confirm that the above details are true and accurate and I undertake to advise you in the event that any of my circumstances change within 14 days of those changes occurring.',
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
