'use strict';

const { spawn } = require('child_process');
const path = require('path');

function usesSessionPooler() {
  const u = (process.env.DATABASE_URL || '').toLowerCase();
  return u.includes('pooler.supabase.com') || u.includes('pooler.supabase.co');
}

function runMigrations() {
  return new Promise((resolve) => {
    const serverRoot = path.resolve(__dirname, '..');
    const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' };
    const migrateScript = usesSessionPooler()
      ? 'migrate-with-url.mjs'
      : 'migrate-direct.mjs';

    console.log(`[migrate:prod] ${migrateScript} (pooler=${usesSessionPooler()})`);

    const child = spawn('node', [path.join(__dirname, migrateScript)], {
      cwd: serverRoot,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', (err) => {
      console.error('[migrate:error]', err);
      resolve(false);
    });
  });
}

module.exports = { runMigrations, runMigrationsSync: runMigrations };

if (require.main === module) {
  runMigrations().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
