const fs = require('fs');
const p = 'client/src/pages/FundacionForm.jsx';
let s = fs.readFileSync(p, 'utf8');

// dead founder block
s = s.replace(/\n            \{false && formData\.founders\.map\([\s\S]*?\)\)\}\n/, '\n');

// step 5
const m = '{formData.councilMembers.map((m, i) => (';
const start = s.indexOf(m);
const end = s.indexOf('// Paso 6: Dignatarios');
if (start >= 0 && end > start) {
  s =
    s.slice(0, start) +
    `{formData.councilMembers.map((_, i) =>
                renderPersonCard(
                    'councilMembers',
                    i,
                    lang === 'en' ? \`DIRECTOR #\${i + 1}\` : \`DIRECTOR #\${i + 1}\`,
                    'director',
                    formData.councilMembers.length > 3,
                    3
                )
            )}
        </div>
    );

    ` +
    s.slice(end);
}

// beneficiaries PersonNameAutocomplete
s = s.replace(
  /\n                const registry = buildPersonRegistry\(formData, \{ arrayName: 'beneficiaries', index: i \}\);\n                return \(\n/,
  '\n                return (\n'
);
s = s.replace(/\n                    <PersonNameAutocomplete[\s\S]*?\/>\n/, '\n');

// POA label
s = s.replace(
  /lang === 'en' \? '⚡ AUTOFILL FROM ANOTHER COMPLETED PERSON' : '⚡ AUTOCOMPLETAR DESDE PERSONA REGISTRADA'/,
  "{t('fundacion.copyFrom')}"
);

if (!s.includes('applyLegacyFullNameSnapshot(')) {
  s = s.replace(/\n    const applyLegacyFullNameSnapshot = [\s\S]*?    \};\n\n    \/\/ Paso 3:/, '\n\n    // Paso 3:');
}

fs.writeFileSync(p, s);
console.log({
  founderDead: s.includes('{false && formData.founders'),
  step5Old: s.includes('councilMembers.map((m, i)'),
  personAuto: s.includes('PersonNameAutocomplete'),
  autocompletar: s.includes('AUTOCOMPLETAR'),
  applyLegacy: s.includes('applyLegacyFullNameSnapshot'),
});
