'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('SPA static assets for production', () => {
  const indexHtml = path.join(__dirname, '../../client/dist/index.html');

  it('client/dist/index.html existe tras npm run build', () => {
    assert.ok(
      fs.existsSync(indexHtml),
      'Falta client/dist/index.html — ejecute: cd client && npm run build'
    );
  });

  it('index.html contiene el root de React', () => {
    const html = fs.readFileSync(indexHtml, 'utf8');
    assert.match(html, /id="root"/);
    assert.match(html, /<script[^>]+src="\/assets\//);
  });
});
