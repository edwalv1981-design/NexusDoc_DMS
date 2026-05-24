'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

function usesSessionPooler() {
  const u = (process.env.DATABASE_URL || '').toLowerCase();
  return u.includes('pooler.supabase.com') || u.includes('pooler.supabase.co');
}

function runMigrationsSync() {
  const serverRoot = path.resolve(__dirname, '..');
  const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' };
  const migrateScript = usesSessionPooler()
    ? 'migrate-with-url.mjs'
    : 'migrate-direct.mjs';

  console.log(`[migrate:prod] ${migrateScript} (pooler=${usesSessionPooler()})`);

  const result = spawnSync('node', [path.join(__dirname, migrateScript)], {
    cwd: serverRoot,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  return result.status === 0;
}

module.exports = { runMigrationsSync };

if (require.main === module) {
  process.exit(runMigrationsSync() ? 0 : 1);
}
