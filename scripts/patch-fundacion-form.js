const fs = require('fs');
const p = 'client/src/pages/FundacionForm.jsx';
let s = fs.readFileSync(p, 'utf8');

s = s.replace(/\s*\{false && formData\.founders\.map\([\s\S]*?\)\)\}/m, '');

s = s.replace(
  "onSelect={(person) => applyPersonSnapshot({ kind: 'fullNameRow', arrayName: 'protectors', index: i }, person)}",
  "onSelect={(person) => applyPersonSnapshot('protectors', i, person)}"
);
s = s.replace(
  "onSelect={(person) => applyPersonSnapshot({ kind: 'splitNameRow', index: i }, person)}",
  "onSelect={(person) => applyPersonSnapshot('councilMembers', i, person)}"
);
s = s.replace(
  "onSelect={(person) => applyPersonSnapshot({ kind: 'fullNameRow', arrayName: 'dignitaries', index: i }, person)}",
  "onSelect={(person) => applyLegacyFullNameSnapshot('dignitaries', i, person)}"
);
s = s.replace(
  "onSelect={(person) => applyPersonSnapshot({ kind: 'fullNameRow', arrayName: 'beneficiaries', index: i }, person)}",
  "onSelect={(person) => applyLegacyFullNameSnapshot('beneficiaries', i, person)}"
);

// Protectors: use renderPersonCard
const protStart = s.indexOf('{formData.protectors.map((p, i) => (');
const protEnd = s.indexOf('// Paso 5: Directores');
if (protStart > 0 && protEnd > protStart) {
  s =
    s.slice(0, protStart) +
    "{formData.protectors.map((_, i) => renderPersonCard('protectors', i, `${lang === 'en' ? 'PROTECTOR' : 'PROTECTOR'} #${i + 1}`, 'protector', formData.protectors.length > 1, 1))}\n            " +
    s.slice(protEnd);
}

// Directors: use renderPersonCard
const dirStart = s.indexOf('{formData.councilMembers.map((m, i) => (');
const dirEnd = s.indexOf('// Paso 6: Dignatarios');
if (dirStart > 0 && dirEnd > dirStart) {
  s =
    s.slice(0, dirStart) +
    "{formData.councilMembers.map((_, i) => renderPersonCard('councilMembers', i, `${lang === 'en' ? 'DIRECTOR' : 'DIRECTOR'} #${i + 1}`, 'director', formData.councilMembers.length > 3, 3))}\n            " +
    s.slice(dirEnd);
}

// POA: vertical stack CSS + checkboxes instead of radios
s = s.replace(/type="radio" name="poaIssue"/g, 'type="checkbox" className="poa-checkbox"');
s = s.replace(/type="radio" name="poaLegalized"/g, 'type="checkbox" className="poa-checkbox"');
s = s.replace(/className="poa-radio"/g, 'className="poa-checkbox"');
s = s.replace(
  /\.poa-original-grid \{ display: grid; grid-template-columns: 1\.2fr 0\.8fr; gap: 20px; margin-top: 20px; \}/,
  `.poa-original-grid { display: flex; flex-direction: column; gap: 24px; margin-top: 20px; }
                .person-fields-stack { display: flex; flex-direction: column; gap: 14px; }
                .poa-checkbox { width: 18px; height: 18px; accent-color: #0e7490; cursor: pointer; border-radius: 2px; }`
);

// Expand director grid fields (id, phone, email, city, country) - insert before address full-width in step 5 if still old
// skipped if renderPersonCard applied

fs.writeFileSync(p, s);
console.log('patched ok');
