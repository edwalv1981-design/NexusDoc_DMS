'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'tests');
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.test.js'))
  .map((f) => path.join(dir, f))
  .sort();

if (!files.length) {
  console.error('run-tests.cjs: no hay archivos *.test.js en tests/');
  process.exit(1);
}

const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status === 0 ? 0 : r.status || 1);
