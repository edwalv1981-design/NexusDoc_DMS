const fs = require('fs');
const p = 'client/src/pages/FundacionForm.jsx';
let s = fs.readFileSync(p, 'utf8');
const a = s.indexOf('{formData.protectors.map((p, i) => (');
const b = s.indexOf('// Paso 5: Directores', a);
if (a < 0 || b < 0) {
  console.error('markers not found', a, b);
  process.exit(1);
}
const rep =
  "{formData.protectors.map((_, i) => renderPersonCard('protectors', i, `${lang === 'en' ? 'PROTECTOR' : 'PROTECTOR'} #${i + 1}`, 'protector', formData.protectors.length > 1, 1))}\n            ";
fs.writeFileSync(p, s.slice(0, a) + rep + s.slice(b));
console.log('ok');
