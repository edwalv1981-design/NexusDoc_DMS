#!/usr/bin/env node
/**
 * Ejecuta sequelize-cli db:migrate cargando server/.env siempre (ignora la regla
 * loadEnv que omite dotenv cuando NODE_ENV=production).
 *
 * Uso: npm run db:migrate:url
 * Requiere DATABASE_URL en server/.env o en el entorno.
 */
import { config as loadDotenv } from 'dotenv';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const envPath = path.join(serverRoot, '.env');

loadDotenv({ path: envPath });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !databaseUrl.trim()) {
  console.error('❌ DATABASE_URL no está definida.');
  console.error('   Cree server/.env con una línea:');
  console.error('   DATABASE_URL=postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-us-east-1.pooler.supabase.co:6543/postgres?sslmode=require');
  console.error('   Si la contraseña tiene caracteres especiales (@ # % / etc.), codifíquelos en URL (encodeURIComponent).');
  process.exit(1);
}

function maskDatabaseUrl(raw) {
  try {
    let normalized = raw;
    if (normalized.startsWith('postgresql://')) {
      normalized = normalized.replace('postgresql://', 'postgres://');
    }
    const u = new URL(normalized);
    const user = decodeURIComponent(u.username);
    const db = u.pathname.replace(/^\//, '') || 'postgres';
    const port = u.port || '5432';
    return `${user}@${u.hostname}:${port}/${db}`;
  } catch {
    return '(URL inválida — revise formato y codificación de la contraseña)';
  }
}

const nodeEnv = process.env.MIGRATE_NODE_ENV || process.env.NODE_ENV || 'development';

console.log(`[migrate] Cargando ${envPath}`);
console.log(`[migrate] DATABASE_URL=${maskDatabaseUrl(databaseUrl)}`);
console.log(`[migrate] NODE_ENV=${nodeEnv}`);

const result = spawnSync('npx', ['sequelize-cli', 'db:migrate'], {
  cwd: serverRoot,
  env: { ...process.env, NODE_ENV: nodeEnv, DATABASE_URL: databaseUrl },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
