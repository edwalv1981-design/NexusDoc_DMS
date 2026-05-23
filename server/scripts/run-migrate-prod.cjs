'use strict';

/**
 * Ejecuta migraciones Sequelize con NODE_ENV=production (Railway / npm run start:prod).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' };
const serverRoot = path.resolve(__dirname, '..');

console.log(`[migrate] NODE_ENV=${env.NODE_ENV}`);

const result = spawnSync('npx', ['sequelize-cli', 'db:migrate'], {
  cwd: serverRoot,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  process.exit(result.status === null ? 1 : result.status);
}
