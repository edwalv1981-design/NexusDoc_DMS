const fs = require('fs');
const p = 'client/src/pages/FundacionForm.jsx';
let s = fs.readFileSync(p, 'utf8');
const bad = `{formData.protectors.map((_, i) => renderPersonCard('protectors', i, \`\${lang === 'en' ? 'PROTECTOR' : 'PROTECTOR'} #\${i + 1}\`, 'protector', formData.protectors.length > 1, 1))}
            // Paso 5: Directores`;
const good = `{formData.protectors.map((_, i) => renderPersonCard('protectors', i, \`\${lang === 'en' ? 'PROTECTOR' : 'PROTECTOR'} #\${i + 1}\`, 'protector', formData.protectors.length > 1, 1))}
        </div>
    );

    // Paso 5: Directores`;
if (s.includes(bad)) {
  s = s.replace(bad, good);
  fs.writeFileSync(p, s);
  console.log('fixed step4 close');
} else {
  console.log('pattern not found, checking balance');
  const o = [...s].reduce((a, c) => a + (c === '(' ? 1 : c === ')' ? -1 : 0), 0);
  console.log('paren', o);
}
