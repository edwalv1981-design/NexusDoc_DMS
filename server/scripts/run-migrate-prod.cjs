'use strict';

/**
 * Ejecuta migraciones Sequelize con NODE_ENV=production (Fly / Railway / npm run db:migrate:prod).
 * En Fly, DATABASE_URL viene de fly secrets; en local usa server/.env vía migrate-with-url.mjs.
 */
const { spawnSync } = require('child_process');
const path = require('path');

function runMigrationsSync() {
  const serverRoot = path.resolve(__dirname, '..');
  const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' };

  const result = spawnSync('node', [path.join(__dirname, 'migrate-with-url.mjs')], {
    cwd: serverRoot,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  return result.status === 0;
}

module.exports = { runMigrationsSync };

if (require.main === module) {
  const ok = runMigrationsSync();
  process.exit(ok ? 0 : 1);
}
