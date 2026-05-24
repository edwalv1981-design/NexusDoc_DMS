#!/usr/bin/env node
/**
 * Migraciones Sequelize: exige DATABASE_URL, carga server/.env siempre (ignora skip de loadEnv en production),
 * muestra URL enmascarada y ejecuta sequelize-cli.
 */
import { config as loadDotenv } from 'dotenv';
import { spawnSync } from 'child_process';
import { lookup } from 'node:dns/promises';
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
      '   DATABASE_URL=postgres://postgres.PROJECT_REF:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require\n' +
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

async function validateDatabaseUrl(raw) {
  let normalized = raw;
  if (normalized.startsWith('postgresql://')) {
    normalized = normalized.replace('postgresql://', 'postgres://');
  }
  const u = new URL(normalized);
  if (!u.password) {
    console.warn('[migrate] AVISO: DATABASE_URL sin contraseña (¿vacía o caracteres sin URL-encode?).');
  }
  if (u.hostname.endsWith('.supabase.co') && u.hostname.includes('pooler')) {
    console.error(
      `❌ Host incorrecto: ${u.hostname}\n` +
        '   El Session pooler usa .supabase.com (NO .supabase.co).\n' +
        '   Ejemplo: aws-0-us-east-1.pooler.supabase.com:6543'
    );
    process.exit(1);
  }
  try {
    await lookup(u.hostname);
  } catch (err) {
    console.error(`❌ No se puede resolver ${u.hostname}: ${err.message}`);
    console.error('   Use Session pooler: aws-0-[REGION].pooler.supabase.com:6543');
    process.exit(1);
  }
}

const nodeEnv = process.env.NODE_ENV || 'development';
const sequelizeCommand = process.argv[2] || 'db:migrate';

await validateDatabaseUrl(databaseUrl);

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
