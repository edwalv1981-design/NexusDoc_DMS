'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { escapeLike } = require('../utils/sqlLike');

describe('escapeLike', () => {
  it('neutraliza comodines de ILIKE', () => {
    assert.equal(escapeLike('%'), '\\%');
    assert.equal(escapeLike('_'), '\\_');
    assert.equal(escapeLike('a\\b'), 'a\\\\b');
    assert.equal(escapeLike('juan_perez%@mail.com'), 'juan\\_perez\\%@mail.com');
  });
  it('no altera correos y cédulas normales', () => {
    assert.equal(escapeLike('juan.perez@gmail.com'), 'juan.perez@gmail.com');
    assert.equal(escapeLike('1712345678'), '1712345678');
    assert.equal(escapeLike(null), '');
  });
});

describe('Registro público sin borrados', () => {
  const src = fs.readFileSync(path.join(__dirname, '../routes/auth.js'), 'utf8');
  const register = src.slice(
    src.indexOf("router.post('/register'"),
    src.indexOf("router.post('/resend-code'")
  );

  it('POST /register no elimina usuarios, perfiles ni formularios', () => {
    assert.ok(register.length > 0);
    assert.doesNotMatch(register, /DELETE FROM "UserProfiles"/);
    assert.doesNotMatch(register, /FormData\.destroy/);
    assert.doesNotMatch(register, /\.destroy\(\s*\{\s*force/);
  });

  it('ninguna búsqueda exacta de correo/cédula usa ILIKE sin escapar', () => {
    for (const file of ['../routes/auth.js', '../routes/admin.js']) {
      const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
      assert.doesNotMatch(code, /\[Op\.iLike\]:\s*(email|idNumber|cleanEmail|targetEmail)\s*\}/, file);
    }
  });
});
