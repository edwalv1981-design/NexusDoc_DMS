const fs = require('fs');
const p = 'client/src/pages/FundacionForm.jsx';
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('{formData.councilMembers.map((m, i) => (');
const end = s.indexOf('// Paso 6: Dignatarios');
if (start === -1 || end === -1) {
  console.error('markers not found', start, end);
  process.exit(1);
}
const replacement = `{formData.councilMembers.map((_, i) =>
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
s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(p, s);
console.log('ok');
