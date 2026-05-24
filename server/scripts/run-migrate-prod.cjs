'use strict';

/**
 * Ejecuta migraciones Sequelize con NODE_ENV=production (Fly / Railway / npm run db:migrate:prod).
 * En local carga server/.env si no hay FLY_APP_NAME.
 */
const { spawnSync } = require('child_process');
const path = require('path');

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  if (process.env.FLY_APP_NAME) return;
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
}

function runMigrationsSync() {
  ensureDatabaseUrl();

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL requerida para db:migrate:prod (server/.env o fly secrets).');
    return false;
  }

  const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' };
  const serverRoot = path.resolve(__dirname, '..');

  console.log(`[migrate] NODE_ENV=${env.NODE_ENV}`);
  console.log(`[migrate] DATABASE_URL=${env.DATABASE_URL ? 'set' : 'missing'}`);

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
