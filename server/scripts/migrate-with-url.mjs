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

const PLACEHOLDER_PASSWORD = /^\[?\s*YOUR[-_]?PASSWORD\s*\]?$/i;

function normalizePostgresUrl(raw) {
  let normalized = raw.trim();
  if (normalized.startsWith('postgresql://')) {
    normalized = normalized.replace('postgresql://', 'postgres://');
  }
  return normalized;
}

function parsePostgresUrl(raw) {
  const normalized = normalizePostgresUrl(raw);
  const m = normalized.match(/^postgres:\/\/([^@]+)@([^/?#]+)(?:\/([^?#]*))?(?:\?([^#]*))?/i);
  if (!m) return null;
  const userPart = m[1];
  const colon = userPart.indexOf(':');
  const username =
    colon >= 0
      ? decodeURIComponent(userPart.slice(0, colon))
      : decodeURIComponent(userPart);
  const password =
    colon >= 0 ? decodeURIComponent(userPart.slice(colon + 1)) : '';
  const hostPort = m[2];
  const slash = hostPort.lastIndexOf(':');
  let hostname = hostPort;
  let port = '';
  if (slash > 0 && /^\d+$/.test(hostPort.slice(slash + 1))) {
    hostname = hostPort.slice(0, slash);
    port = hostPort.slice(slash + 1);
  }
  return {
    username,
    password,
    hostname,
    port: port || '5432',
    database: (m[3] || 'postgres').replace(/^\//, '') || 'postgres',
    search: m[4] ? `?${m[4]}` : '',
  };
}

function maskDatabaseUrl(raw) {
  try {
    const parsed = parsePostgresUrl(raw);
    if (!parsed) {
      return '(URL inválida — revise formato y contraseña URL-encoded)';
    }
    const { username, password, hostname, port, database } = parsed;
    const cred = password ? `${username}:***` : `${username}:(sin contraseña)`;
    const qs = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
    return `postgres://${cred}@${hostname}:${port}/${database}${qs}`;
  } catch {
    return '(URL inválida — revise formato y contraseña URL-encoded)';
  }
}

function isPlaceholderPassword(password) {
  if (!password || !String(password).trim()) return true;
  return PLACEHOLDER_PASSWORD.test(String(password).trim());
}

async function validateDatabaseUrl(raw) {
  const normalized = normalizePostgresUrl(raw);
  const parsed = parsePostgresUrl(normalized);
  if (!parsed) {
    console.error(
      '❌ DATABASE_URL con formato inválido.\n' +
        '   Ejemplo: postgres://postgres.PROJECT_REF:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require'
    );
    process.exit(1);
  }
  const { username: user, password, hostname } = parsed;
  const expectedRef = process.env.SUPABASE_PROJECT_REF?.trim();
  if (user && !/^postgres(\.[a-z0-9]+)?$/i.test(user)) {
    console.warn(
      `[migrate] AVISO: usuario "${user}" — Session pooler requiere postgres.PROJECT_REF (copie desde Connect).`
    );
  } else if (expectedRef && user !== `postgres.${expectedRef}` && user !== 'postgres') {
    console.warn(
      `[migrate] AVISO: usuario "${user}" ≠ postgres.${expectedRef} — "Tenant or user not found" suele ser host/región o usuario incorrecto.`
    );
  }
  if (!password || isPlaceholderPassword(password)) {
    console.error(
      '❌ DATABASE_URL sin contraseña (falta :PASSWORD@ entre usuario y host).\n' +
        '   Pegue la URI COMPLETA desde Supabase Connect reemplazando [YOUR-PASSWORD] por su contraseña de BD,\n' +
        '   o defina solo la contraseña y deje que el script arme la URL.\n' +
        `   Recibido (enmascarado): ${maskDatabaseUrl(normalized)}`
    );
    process.exit(1);
  }
  if (hostname.endsWith('.supabase.co') && hostname.includes('pooler')) {
    console.error(
      `❌ Host incorrecto: ${hostname}\n` +
        '   El Session pooler usa .supabase.com (NO .supabase.co).\n' +
        '   Ejemplo: aws-0-us-east-1.pooler.supabase.com:6543'
    );
    process.exit(1);
  }
  try {
    await lookup(hostname);
  } catch (err) {
    console.error(`❌ No se puede resolver ${hostname}: ${err.message}`);
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
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
});

const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`;
if (combined) process.stdout.write(combined);
if (/password authentication failed|28P01|invalid password/i.test(combined)) {
  console.error(
    '\n❌ Contraseña incorrecta.\n' +
      '   Supabase → Project Settings → Database → Reset database password.\n' +
      '   Use la contraseña de base de datos (NO la del admin de la app).'
  );
} else if (/Tenant or user not found/i.test(combined)) {
  console.error(
    '\n❌ Tenant or user not found — host/región del pooler incorrecto o usuario distinto de postgres.PROJECT_REF.\n' +
      '   Para migraciones use conexión directa: postgres://postgres:***@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require\n' +
      '   Para la app/Fly use Transaction pooler (6543): postgres://postgres.PROJECT_REF:***@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true'
  );
}

process.exit(result.status === 0 ? 0 : result.status ?? 1);
