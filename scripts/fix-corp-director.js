'use strict';
const fs = require('fs');
const f = require('path').join(__dirname, '../client/src/pages/CorporacionForm.jsx');
let s = fs.readFileSync(f, 'utf8');
s = s.replace(
  "onChange={e => { updateDirector(i, 'firstName', e.target.value); if (e.target.value.includes(' ')) tryApplyDirectorFromDraft(i, { ...d, firstName: e.target.value }); }} onBlur={() => tryApplyDirectorFromDraft(i, d)} autoComplete=\"off\"",
  "onChange={e => updateDirector(i, 'firstName', e.target.value)}"
);
fs.writeFileSync(f, s);
console.log(s.includes('tryApply') ? 'still has tryApply' : 'ok');
