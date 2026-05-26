const fs = require('fs');
const p = 'client/src/pages/FundacionForm.jsx';
let s = fs.readFileSync(p, 'utf8');

s = s.replace(/\n            \{false && formData\.founders\.map\([\s\S]*?\)\)\}\n/, '\n');

const step5Start = s.indexOf('{formData.councilMembers.map((m, i)');
const step5End = s.indexOf('// Paso 6: Dignatarios');
if (step5Start !== -1 && step5End !== -1) {
  const before = s.slice(0, step5Start);
  const after = s.slice(step5End);
  const step5New = `{formData.councilMembers.map((_, i) =>
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

    `;
  s = before + step5New + after;
}

s = s.replace(
  /\n                const registry = buildPersonRegistry\(formData, \{ arrayName: 'beneficiaries', index: i \}\);\n                return \(\n/,
  '\n                return (\n'
);
s = s.replace(/\n                    <PersonNameAutocomplete[\s\S]*?\/>\n/, '\n');

s = s.replace(
  /lang === 'en' \? '⚡ AUTOFILL FROM ANOTHER COMPLETED PERSON' : '⚡ AUTOCOMPLETAR DESDE PERSONA REGISTRADA'/,
  "{t('fundacion.copyFrom')}"
);

if (!s.includes('applyLegacyFullNameSnapshot(')) {
  s = s.replace(/\n    const applyLegacyFullNameSnapshot = [\s\S]*?    \};\n\n    \/\/ Paso 3:/, '\n\n    // Paso 3:');
}

s = s.replace(/,\n    FUNDACION_PERSON_FIELDS,\n/, '\n');

fs.writeFileSync(p, s);
console.log('PersonNameAutocomplete:', s.includes('PersonNameAutocomplete'));
console.log('applyLegacy:', s.includes('applyLegacyFullNameSnapshot'));
