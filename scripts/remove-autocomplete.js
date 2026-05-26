'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// --- FundacionForm ---
let ff = fs.readFileSync(path.join(root, 'client/src/pages/FundacionForm.jsx'), 'utf8');

ff = ff.replace(
  "import FundacionPersonFields from '../components/FundacionPersonFields';\nimport FundacionRegistryNameInput from '../components/FundacionRegistryNameInput';\n",
  "import FundacionPersonFields from '../components/FundacionPersonFields';\n"
);

ff = ff.replace(
  `import {
    emptyFundacionPerson,
    emptyFundacionDignitary,
    emptyFundacionBeneficiary,
    normalizeFundacionPerson,
    normalizeLoadedFundacionData,
    personDisplayName,
    poaPersonFromFormData,
    POA_FORM_FIELD_MAP,
    FUNDACION_DIGNITARY_FIELDS,
} from '../utils/fundacionPersonSchema';
import {
    buildRegistry,
    applyRoleFields,
    pickFields,
    findMatch,
    findPersonInRegistry,
    getPersonNameSuggestions,
    snapshotPersonFields,
} from '../utils/fundacionPersonRegistry';

const BENEFICIARY_REGISTRY_FILL = ['birthDate', 'address'];

`,
  `import {
    emptyFundacionPerson,
    emptyFundacionDignitary,
    emptyFundacionBeneficiary,
    normalizeLoadedFundacionData,
    poaPersonFromFormData,
    POA_FORM_FIELD_MAP,
} from '../utils/fundacionPersonSchema';

`
);

ff = ff.replace(
  /    const applyRegistryPerson[\s\S]*?    };\n\n    const mergePersonIntoRow[\s\S]*?    };\n\n    const tryApplyPoaFromTypedName[\s\S]*?    };\n\n/,
  ''
);

ff = ff.replace(
  /    const renderPersonCard = \(arrayName, index, cardLabel, excludeStep, canRemove, minItems\) => \{\n        const registry = buildRegistry\(formData, \{ arrayName, index \}\);\n        return \(\n/,
  `    const renderPersonCard = (arrayName, index, cardLabel, excludeStep, canRemove, minItems) => (\n`
);

ff = ff.replace(
  `            <FundacionPersonFields
                person={formData[arrayName][index]}
                lang={lang}
                t={t}
                personRegistry={registry}
                onApplyPerson={(fields) => applyRegistryPerson(arrayName, index, fields)}
                onChange={(field, value) => updateArrayField(arrayName, index, field, value)}
            />
        </div>
        );
    };`,
  `            <FundacionPersonFields
                person={formData[arrayName][index]}
                lang={lang}
                t={t}
                onChange={(field, value) => updateArrayField(arrayName, index, field, value)}
            />
        </div>
    );`
);

ff = ff.replace(
  /            \{formData\.dignitaries\.map\(\(d, i\) => \{\n                const registry = buildRegistry\(formData, \{ arrayName: 'dignitaries', index: i \}\);\n                return \(\n/,
  `            {formData.dignitaries.map((d, i) => (\n`
);

ff = ff.replace(
  `<FundacionRegistryNameInput
                                value={d.fullName || ''}
                                onChange={(v) => updateArrayField('dignitaries', i, 'fullName', v)}
                                registry={registry}
                                listId={\`dignitary-name-\${i}\`}
                                placeholder={t('fundacion.dignitary.fullNamePlaceholder')}
                                onMatch={(data) => mergePersonIntoRow('dignitaries', i, data, FUNDACION_DIGNITARY_FIELDS)}
                            />`,
  `<input
                                className="expert-input"
                                value={d.fullName || ''}
                                onChange={(e) => updateArrayField('dignitaries', i, 'fullName', e.target.value)}
                                placeholder={t('fundacion.dignitary.fullNamePlaceholder')}
                            />`
);

ff = ff.replace(/\n                \);\n            \}\)\}/, '\n            ))}');

ff = ff.replace(
  /            \{formData\.beneficiaries\.map\(\(b, i\) => \{\n                const registry = buildRegistry\(formData, \{ arrayName: 'beneficiaries', index: i \}\);\n                return \(\n/,
  `            {formData.beneficiaries.map((b, i) => (\n`
);

ff = ff.replace(
  `<FundacionRegistryNameInput
                                value={b.shareholder || ''}
                                onChange={(v) => updateArrayField('beneficiaries', i, 'shareholder', v)}
                                registry={registry}
                                listId={\`beneficiary-shareholder-\${i}\`}
                                placeholder={t('fundacion.beneficiary.shareholderPlaceholder')}
                                onMatch={(data) => {
                                    const fill = pickFields(data, BENEFICIARY_REGISTRY_FILL);
                                    setFormData((prev) => {
                                        const rows = [...prev.beneficiaries];
                                        rows[i] = { ...rows[i], ...fill };
                                        return { ...prev, beneficiaries: rows };
                                    });
                                }}
                            />`,
  `<input
                                className="expert-input"
                                value={b.shareholder || ''}
                                onChange={(e) => updateArrayField('beneficiaries', i, 'shareholder', e.target.value)}
                                placeholder={t('fundacion.beneficiary.shareholderPlaceholder')}
                            />`
);

ff = ff.replace(
  /    const applyPoaRegistryPerson = \(fields\) => \{[\s\S]*?    \};\n\n    \/\/ Paso 8/,
  '    // Paso 8'
);

ff = ff.replace(
  /    const renderStep8 = \(\) => \{\n        const poaRegistry = buildRegistry\(formData, \{ arrayName: 'poa' \}\);\n        return \(/,
  '    const renderStep8 = () => ('
);

ff = ff.replace(
  `<FundacionPersonFields
                                person={poaPersonFromFormData(formData)}
                                lang={lang}
                                t={t}
                                personRegistry={poaRegistry}
                                onApplyPerson={applyPoaRegistryPerson}
                                onChange={updatePoaField}
                                onNameBlur={tryApplyPoaFromTypedName}
                                nameListId="poa-names"
                            />`,
  `<FundacionPersonFields
                                person={poaPersonFromFormData(formData)}
                                lang={lang}
                                t={t}
                                onChange={updatePoaField}
                            />`
);

ff = ff.replace(/\n        \);\n    \};\n\n    \/\/ Paso 9/, '\n    );\n\n    // Paso 9');

ff = ff.replace(
  ` list="names-global"`,
  ''
);

ff = ff.replace(
  /            \{\/\* DATALISTS PARA AUTOCOMPLETADO \*\/\}[\s\S]*?            <\/datalist>\n\n            <datalist id="roles-dignitaries">/,
  `            <datalist id="roles-dignitaries">`
);

if (ff.includes('FundacionRegistryNameInput')) throw new Error('FundacionForm still has FundacionRegistryNameInput');
if (ff.includes('buildRegistry')) throw new Error('FundacionForm still has buildRegistry');
if (ff.includes('tryApplyPoa')) throw new Error('FundacionForm still has tryApplyPoa');
fs.writeFileSync(path.join(root, 'client/src/pages/FundacionForm.jsx'), ff);
console.log('FundacionForm.jsx patched');

// --- CorporacionForm ---
let cf = fs.readFileSync(path.join(root, 'client/src/pages/CorporacionForm.jsx'), 'utf8');

cf = cf.replace(
  `import React, { useState, useEffect, useCallback } from 'react';`,
  `import React, { useState, useEffect } from 'react';`
);

cf = cf.replace(
  `import FundacionRegistryNameInput from '../components/FundacionRegistryNameInput';
import {
    buildCorporacionPersonRegistry,
    findPersonInRegistry,
    pickCorporacionDirectorFields,
    pickCorporacionDignitaryFields,
    pickCorporacionShareholderPersonFields,
    pickCorporacionSignerFields,
    normalizeLoadedCorporacionData,
} from '../utils/corporacionPersonRegistry';
`,
  `import { normalizeLoadedCorporacionData } from '../utils/corporacionPersonRegistry';
`
);

cf = cf.replace(
  /    const registryForRow = useCallback\([\s\S]*?    \);\n\n    const applyDirectorAt[\s\S]*?    \);\n\n    const tryApplyDirectorFromDraft[\s\S]*?    \);\n\n/,
  ''
);

cf = cf.replace(
  /<input className="expert-input" value={d\.firstName} onChange={e => \{ updateDirector\(i, 'firstName', e\.target\.value\); if \(e\.target\.value\.includes\(' '\)\) tryApplyDirectorFromDraft\(i, \{ \.\.\.d, firstName: e\.target\.value \}\); \} \} onBlur=\{\(\) => tryApplyDirectorFromDraft\(i, d\)\} autoComplete="off" \/>/,
  `<input className="expert-input" value={d.firstName} onChange={e => updateDirector(i, 'firstName', e.target.value)} />`
);

cf = cf.replace(
  /<input className="expert-input" value={d\.lastName} onChange={e => updateDirector\(i, 'lastName', e\.target\.value\)} onBlur=\{\(\) => tryApplyDirectorFromDraft\(i, d\)\} autoComplete="off" \/>/,
  `<input className="expert-input" value={d.lastName} onChange={e => updateDirector(i, 'lastName', e.target.value)} />`
);

cf = cf.replace(
  /<FundacionRegistryNameInput value={dig\.fullName} onChange=\{\(v\) => updateDignitary\(i, 'fullName', v\)\} registry={registryForRow\('dignitaries', i\)} onMatch=\{\(hit\) => applyDignitaryAt\(i, hit\)\} className="expert-input" \/>/,
  `<input className="expert-input" value={dig.fullName} onChange={e => updateDignitary(i, 'fullName', e.target.value)} />`
);

cf = cf.replace(
  /<FundacionRegistryNameInput value={s\.name} onChange=\{\(v\) => updateShareholder\(i, 'name', v\)\} registry={registryForRow\('shareholders', i\)} onMatch=\{\(hit\) => applyShareholderAt\(i, hit\)\} className="expert-input" \/>/,
  `<input className="expert-input" value={s.name} onChange={e => updateShareholder(i, 'name', e.target.value)} />`
);

cf = cf.replace(
  /<FundacionRegistryNameInput value={s\.name} onChange=\{\(v\) => updateSigner\(i, 'name', v\)\} registry={registryForRow\('signers', i\)} onMatch=\{\(hit\) => applySignerAt\(i, hit\)\} className="expert-input-legal" placeholder={lang === 'en' \? 'e\.g\. John Doe' : 'Ej: Pedro Roman Romano'} \/>/,
  `<input className="expert-input-legal" value={s.name} onChange={e => updateSigner(i, 'name', e.target.value)} placeholder={lang === 'en' ? 'e.g. John Doe' : 'Ej: Pedro Roman Romano'} />`
);

if (cf.includes('FundacionRegistryNameInput')) throw new Error('CorporacionForm still has FundacionRegistryNameInput');
if (cf.includes('tryApplyDirector')) throw new Error('CorporacionForm still has tryApplyDirector');
fs.writeFileSync(path.join(root, 'client/src/pages/CorporacionForm.jsx'), cf);
console.log('CorporacionForm.jsx patched');

// --- FondosForm: remove datalist UI only ---
let fondos = fs.readFileSync(path.join(root, 'client/src/pages/FondosForm.jsx'), 'utf8');
fondos = fondos.replace(/\s*list="form-names-suggestions"/g, '');
fondos = fondos.replace(
  /\n\s*\{\/\* DATALIST PARA AUTOCOMPLETADO INTERNO DEL SISTEMA \*\/\}\n\s*<datalist id="form-names-suggestions">[\s\S]*?<\/datalist>\n/,
  '\n'
);
fs.writeFileSync(path.join(root, 'client/src/pages/FondosForm.jsx'), fondos);
console.log('FondosForm.jsx patched');

// --- corporacionPersonRegistry: keep normalize only ---
const corpReg = `import {
  personDisplayName,
  normalizeFundacionPerson,
  mergePersonRecords,
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
      passport: d?.passport || '',
      birthDate: d?.birthDate || '',
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

// --- i18n ---
for (const loc of ['es.js', 'en.js']) {
  let i18n = fs.readFileSync(path.join(root, 'client/src/i18n/locales', loc), 'utf8');
  i18n = i18n.replace(/\n    copyFrom:.*\n    copySelect:.*\n/, '\n');
  fs.writeFileSync(path.join(root, 'client/src/i18n/locales', loc), i18n);
}
console.log('i18n copyFrom/copySelect removed');

// --- delete unused components ---
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

// --- server tests ---
fs.unlinkSync(path.join(root, 'server/tests/corporacionPersonRegistry.test.js'));
console.log('deleted corporacionPersonRegistry.test.js');

let regTest = fs.readFileSync(path.join(root, 'server/tests/fundacionPersonRegistry.test.js'), 'utf8');
regTest = regTest.replace(/test\('findMatch matches normalized full name'[\s\S]*?}\);\n\n/, '');
regTest = regTest.replace(/test\('findMatch ignores accent differences'[\s\S]*?}\);\n\n/, '');
regTest = regTest.replace(/test\('beneficiary fill omits percentage from registry'[\s\S]*?}\);\n\n/, '');
regTest = regTest.replace(/function findMatch[\s\S]*?}\n\n/, '');
fs.writeFileSync(path.join(root, 'server/tests/fundacionPersonRegistry.test.js'), regTest);
console.log('fundacionPersonRegistry.test.js trimmed');

console.log('Done.');
