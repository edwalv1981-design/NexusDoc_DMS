'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// FondosForm: remove datalist UI only
let fondos = fs.readFileSync(path.join(root, 'client/src/pages/FondosForm.jsx'), 'utf8');
fondos = fondos.replace(/\s*list="form-names-suggestions"/g, '');
fondos = fondos.replace(
  /\n\s*\{\/\* DATALIST PARA AUTOCOMPLETADO INTERNO DEL SISTEMA \*\/\}\n\s*<datalist id="form-names-suggestions">[\s\S]*?<\/datalist>\n/,
  '\n'
);
fs.writeFileSync(path.join(root, 'client/src/pages/FondosForm.jsx'), fondos);
console.log('FondosForm patched');

// corporacionPersonRegistry: normalize only
const corpReg = `import {
  normalizeFundacionPerson,
  ensurePersonArray,
} from './fundacionPersonSchema';

/** Migra dignatarios legacy (objeto por rol) a arreglo. */
export function normalizeLoadedCorporacionData(raw = {}, defaults = {}) {
  const clean = { ...raw };

  clean.directors = ensurePersonArray(clean.directors, defaults.directors).map((d) =>
    normalizeFundacionPerson(d)
  );

  if (clean.dignitaries && !Array.isArray(clean.dignitaries)) {
    clean.dignitaries = Object.entries(clean.dignitaries).map(([role, d]) => ({
      role: (d?.role || role || '').toString().toUpperCase(),
      fullName: d?.fullName || '',
      birthDate: d?.birthDate || '',
      passport: d?.passport || '',
      registrationNumber: d?.registrationNumber || '',
    }));
  } else {
    clean.dignitaries = ensurePersonArray(clean.dignitaries, defaults.dignitaries).map((d) => ({
      role: d?.role || '',
      fullName: d?.fullName || '',
      birthDate: d?.birthDate || '',
      passport: d?.passport || '',
      registrationNumber: d?.registrationNumber || '',
    }));
  }

  clean.shareholders = ensurePersonArray(clean.shareholders, defaults.shareholders);
  clean.signers = ensurePersonArray(clean.signers, defaults.signers).map((s) => ({
    name: s?.name || '',
    signature: s?.signature || '',
  }));

  return clean;
}
`;
fs.writeFileSync(path.join(root, 'client/src/utils/corporacionPersonRegistry.js'), corpReg);
console.log('corporacionPersonRegistry.js trimmed');

for (const loc of ['es.js', 'en.js']) {
  let i18n = fs.readFileSync(path.join(root, 'client/src/i18n/locales', loc), 'utf8');
  i18n = i18n.replace(/\n    copyFrom:.*\n    copySelect:.*\n/, '\n');
  fs.writeFileSync(path.join(root, 'client/src/i18n/locales', loc), i18n);
}
console.log('i18n updated');

for (const f of [
  'client/src/components/FundacionRegistryNameInput.jsx',
  'client/src/components/PersonNameAutocomplete.jsx',
  'client/src/utils/fundacionPersonRegistry.js',
]) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('deleted', f);
  }
}

const corpTest = path.join(root, 'server/tests/corporacionPersonRegistry.test.js');
if (fs.existsSync(corpTest)) {
  fs.unlinkSync(corpTest);
  console.log('deleted corporacionPersonRegistry.test.js');
}

let regTest = fs.readFileSync(path.join(root, 'server/tests/fundacionPersonRegistry.test.js'), 'utf8');
regTest = regTest.replace(/test\('findMatch matches normalized full name'[\s\S]*?}\);\n\n/, '');
regTest = regTest.replace(/test\('findMatch ignores accent differences'[\s\S]*?}\);\n\n/, '');
regTest = regTest.replace(/test\('beneficiary fill omits percentage from registry'[\s\S]*?}\);\n\n/, '');
regTest = regTest.replace(/function findMatch[\s\S]*?}\n\n/, '');
fs.writeFileSync(path.join(root, 'server/tests/fundacionPersonRegistry.test.js'), regTest);
console.log('fundacionPersonRegistry.test.js trimmed');

// Verify FundacionForm
const ff = fs.readFileSync(path.join(root, 'client/src/pages/FundacionForm.jsx'), 'utf8');
for (const k of ['FundacionRegistryNameInput', 'buildRegistry', 'tryApplyPoa', 'getPersonNameSuggestions']) {
  if (ff.includes(k)) console.warn('FundacionForm still has', k);
}
console.log('Done cleanup.');
