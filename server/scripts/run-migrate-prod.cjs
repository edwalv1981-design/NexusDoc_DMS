'use strict';

/**
 * Ejecuta migraciones Sequelize con NODE_ENV=production (Fly / Railway / npm run db:migrate:prod).
 */
const { spawnSync } = require('child_process');
const path = require('path');

function runMigrationsSync() {
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
    return false;
  }
  return true;
}

module.exports = { runMigrationsSync };

if (require.main === module) {
  const ok = runMigrationsSync();
  process.exit(ok ? 0 : 1);
}
