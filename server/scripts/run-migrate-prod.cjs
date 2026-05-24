'use strict';

/**
 * Ejecuta migraciones Sequelize con NODE_ENV=production (Fly / Railway / npm run db:migrate:prod).
 * En Fly, DATABASE_URL (Session pooler) aporta la contraseña; migrate-direct usa conexión directa :5432.
 */
const { spawnSync } = require('child_process');
const path = require('path');

function runMigrationsSync() {
  const serverRoot = path.resolve(__dirname, '..');
  const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' };

  const result = spawnSync('node', [path.join(__dirname, 'migrate-direct.mjs')], {
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
