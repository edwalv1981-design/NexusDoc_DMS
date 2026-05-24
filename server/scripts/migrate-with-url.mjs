#!/usr/bin/env node
/**
 * Migraciones Sequelize: exige DATABASE_URL, carga server/.env siempre (ignora skip de loadEnv en production),
 * muestra URL enmascarada y ejecuta sequelize-cli.
 */
import { config as loadDotenv } from 'dotenv';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const envPath = path.join(serverRoot, '.env');

const dotenvResult = loadDotenv({ path: envPath });
if (dotenvResult.error && dotenvResult.error.code !== 'ENOENT') {
  console.warn(`[migrate] No se pudo leer ${envPath}: ${dotenvResult.error.message}`);
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error(
    '❌ DATABASE_URL no está definida.\n' +
      `   Cree ${envPath} con una sola línea:\n` +
      '   DATABASE_URL=postgres://postgres.PROJECT_REF:PASSWORD@aws-1-us-east-1.pooler.supabase.co:6543/postgres?sslmode=require\n' +
      '   Si la contraseña tiene @ # % etc., codifíquela (encodeURIComponent) en la URL.\n' +
      '   Contraseña incorrecta: Supabase Dashboard → Project Settings → Database → Reset database password.'
  );
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
    const host = u.hostname;
    const port = u.port || '5432';
    const db = u.pathname.replace(/^\//, '') || 'postgres';
    return `postgres://${user}@${host}:${port}/${db}`;
  } catch {
    return '(URL inválida — revise formato y contraseña URL-encoded)';
  }
}

const nodeEnv = process.env.NODE_ENV || 'development';
const sequelizeCommand = process.argv[2] || 'db:migrate';

console.log(`[migrate] NODE_ENV=${nodeEnv}`);
console.log(`[migrate] DATABASE_URL=${maskDatabaseUrl(databaseUrl)}`);
console.log(`[migrate] comando=sequelize-cli ${sequelizeCommand}`);

const result = spawnSync('npx', ['sequelize-cli', sequelizeCommand], {
  cwd: serverRoot,
  env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: nodeEnv },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status === 0 ? 0 : result.status ?? 1);
