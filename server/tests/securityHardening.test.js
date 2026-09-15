'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isPdfBuffer, sanitizeDownloadFilename } = require('../utils/pdfMagic');
const { publicUser } = require('../utils/publicUser');

describe('pdfMagic', () => {
  it('acepta cabecera %PDF-', () => {
    assert.equal(isPdfBuffer(Buffer.from('%PDF-1.7 rest')), true);
  });
  it('rechaza no-PDF', () => {
    assert.equal(isPdfBuffer(Buffer.from('<html>')), false);
    assert.equal(isPdfBuffer(null), false);
  });
  it('sanitiza filename', () => {
    assert.equal(sanitizeDownloadFilename('a.pdf";\r\nfilename="x'), 'a.pdf__;__filename=_x');
  });
});

describe('publicUser', () => {
  it('nunca incluye password ni tokens', () => {
    const out = publicUser({
      id: '1',
      name: 'A',
      email: 'a@b.c',
      role: 'client',
      password: 'hash',
      securityCode: '123',
      activeToken: 'jwt',
    });
    assert.equal(out.password, undefined);
    assert.equal(out.securityCode, undefined);
    assert.equal(out.activeToken, undefined);
    assert.equal(out.email, 'a@b.c');
  });
});
