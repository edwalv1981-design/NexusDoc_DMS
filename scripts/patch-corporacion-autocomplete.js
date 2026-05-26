'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const file = path.join(root, 'client/src/pages/CorporacionForm.jsx');
let cf = fs.readFileSync(file, 'utf8');

cf = cf.replace(
  "import React, { useState, useEffect, useCallback } from 'react';",
  "import React, { useState, useEffect } from 'react';"
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
  /    const registryForRow = useCallback\([\s\S]*?\[registryForRow, applyDirectorAt\]\n    \);\n\n/,
  ''
);

cf = cf.replace(
  / onChange={e => \{ updateDirector\(i, 'firstName', e\.target\.value\); if \(e\.target\.value\.includes\(' '\)\) tryApplyDirectorFromDraft\(i, \{ \.\.\.d, firstName: e\.target\.value \}\); \} \} onBlur=\{\(\) => tryApplyDirectorFromDraft\(i, d\)\} autoComplete="off"/g,
  ` onChange={e => updateDirector(i, 'firstName', e.target.value)}`
);

cf = cf.replace(
  / onChange={e => updateDirector\(i, 'lastName', e\.target\.value\)\} onBlur=\{\(\) => tryApplyDirectorFromDraft\(i, d\)\} autoComplete="off"/g,
  ` onChange={e => updateDirector(i, 'lastName', e.target.value)}`
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

fs.writeFileSync(file, cf);
const left = ['FundacionRegistryNameInput', 'tryApplyDirector', 'registryForRow', 'buildCorporacionPersonRegistry'].filter((k) => cf.includes(k));
console.log(left.length ? 'WARN remaining: ' + left.join(', ') : 'CorporacionForm clean');
