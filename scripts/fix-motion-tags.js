'use strict';
const fs = require('fs');
const files = process.argv.slice(2);
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replaceAll('<motion', '<div');
  c = c.replaceAll('</motion>', '</div>');
  fs.writeFileSync(f, c);
  console.log('fixed', f);
}
