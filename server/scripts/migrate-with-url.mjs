#!/usr/bin/env node
/**
 * Migraciones Sequelize: exige DATABASE_URL, carga server/.env siempre (ignora skip de loadEnv en production),
 * muestra URL enmascarada y ejecuta sequelize-cli.
 */
import { config as loadDotenv } from 'dotenv';
import { spawnSync } from 'child_process';
import { lookup } from 'node:dns/promises';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { prepareDatabaseUrlForPg } = require('../config/normalizeDatabaseUrl.js');

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
    'âŒ DATABASE_URL no estÃ¡ definida.\n' +
      `   Cree ${envPath} con una sola lÃ­nea:\n` +
      '   DATABASE_URL=postgres://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require\n' +
      '   Si la contraseÃ±a tiene @ # % etc., codifÃ­quela (encodeURIComponent) en la URL.\n' +
      '   ContraseÃ±a incorrecta: Supabase Dashboard â†’ Project Settings â†’ Database â†’ Reset database password.'
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
      return '(URL invÃ¡lida â€” revise formato y contraseÃ±a URL-encoded)';
    }
    const { username, password, hostname, port, database } = parsed;
    const cred = password ? `${username}:***` : `${username}:(sin contraseÃ±a)`;
    const qs = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
    return `postgres://${cred}@${hostname}:${port}/${database}${qs}`;
  } catch {
    return '(URL invÃ¡lida â€” revise formato y contraseÃ±a URL-encoded)';
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
      'âŒ DATABASE_URL con formato invÃ¡lido.\n' +
        '   Ejemplo directa (migraciones): postgres://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require'
    );
    process.exit(1);
  }
  const { username: user, password, hostname, port } = parsed;
  const expectedRef = process.env.SUPABASE_PROJECT_REF?.trim();
  const isDirectHost =
    /^db\.[a-z0-9]+\.supabase\.co$/i.test(hostname) ||
    (expectedRef && hostname === `db.${expectedRef}.supabase.co`);
  const isPoolerHost = hostname.includes('pooler.supabase.com');

  if (isPoolerHost) {
    const expectedPoolerUser = expectedRef ? `postgres.${expectedRef}` : null;
    if (expectedPoolerUser && user !== expectedPoolerUser) {
      console.error(
        `âŒ Session pooler requiere usuario "${expectedPoolerUser}", no "${user}".\n` +
          `   Ejemplo: postgres://${expectedPoolerUser}:***@${hostname}:5432/postgres?sslmode=require\n` +
          '   Use aws-0-[REGION].pooler.supabase.com del panel Connect (no aws-1 si su proyecto estÃ¡ en aws-0).'
      );
      process.exit(1);
    }
    if (port && port !== '5432' && port !== '6543') {
      console.warn(`[migrate] AVISO: pooler suele usar 5432 (Session) o 6543 (Transaction), recibido ${port}.`);
    }
  }

  if (isDirectHost) {
    if (user !== 'postgres') {
      console.error(
        `âŒ ConexiÃ³n directa requiere usuario "postgres", no "${user}".\n` +
          `   Ejemplo: postgres://postgres:***@db.${expectedRef || 'PROJECT_REF'}.supabase.co:5432/postgres?sslmode=require`
      );
      process.exit(1);
    }
    if (port && port !== '5432') {
      console.warn(`[migrate] AVISO: directa suele usar puerto 5432, recibido ${port}.`);
    }
  } else if (user && !/^postgres(\.[a-z0-9]+)?$/i.test(user)) {
    console.warn(`[migrate] AVISO: usuario "${user}" inesperado para migraciones.`);
  }
  if (!password || isPlaceholderPassword(password)) {
    console.error(
      'âŒ DATABASE_URL sin contraseÃ±a (falta :PASSWORD@ entre usuario y host).\n' +
        '   Pegue la URI COMPLETA desde Supabase Connect reemplazando [YOUR-PASSWORD] por su contraseÃ±a de BD,\n' +
        '   o defina solo la contraseÃ±a y deje que el script arme la URL.\n' +
        `   Recibido (enmascarado): ${maskDatabaseUrl(normalized)}`
    );
    process.exit(1);
  }
  if (hostname.endsWith('.supabase.co') && hostname.includes('pooler')) {
    console.error(
      `âŒ Host incorrecto: ${hostname}\n` +
        '   El Session pooler usa .supabase.com (NO .supabase.co).\n' +
        '   Ejemplo: aws-0-us-east-1.pooler.supabase.com:5432'
    );
    process.exit(1);
  }
  try {
    await lookup(hostname);
  } catch (err) {
    console.error(`âŒ No se puede resolver ${hostname}: ${err.message}`);
    console.error(
      '   Directa: db.PROJECT_REF.supabase.co:5432 | Si su ISP bloquea db.*.supabase.co, use Session pooler aws-0-[REGION].pooler.supabase.com:5432'
    );
    process.exit(1);
  }
}

const nodeEnv = process.env.NODE_ENV || 'development';
const sequelizeCommand = process.argv[2] || 'db:migrate';

const effectiveDatabaseUrl = prepareDatabaseUrlForPg(databaseUrl);

await validateDatabaseUrl(effectiveDatabaseUrl);

console.log(`[migrate] NODE_ENV=${nodeEnv}`);
console.log(`[migrate] DATABASE_URL=${maskDatabaseUrl(databaseUrl)}`);
console.log(`[migrate] comando=sequelize-cli ${sequelizeCommand}`);

const result = spawnSync('npx', ['sequelize-cli', sequelizeCommand], {
  cwd: serverRoot,
  env: { ...process.env, DATABASE_URL: effectiveDatabaseUrl, NODE_ENV: nodeEnv },
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
});

const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`;
if (combined) process.stdout.write(combined);
if (/password authentication failed|28P01|invalid password/i.test(combined)) {
  console.error(
    '\nâŒ ContraseÃ±a incorrecta.\n' +
      '   Supabase â†’ Project Settings â†’ Database â†’ Reset database password.\n' +
      '   Use la contraseÃ±a de base de datos (NO la del admin de la app).'
  );
} else if (/Tenant or user not found/i.test(combined)) {
  console.error(
    '\nâŒ Tenant or user not found â€” host pooler o usuario postgres.PROJECT_REF no coinciden con SU proyecto.\n' +
      '   NO invente aws-0/aws-1: copie la URI EXACTA desde Supabase â†’ Connect (Session pooler).\n' +
      '   Ejecute: ..\\scripts\\verify-supabase-project.ps1\n' +
      '   Proyecto pausado: Dashboard â†’ Restore project. ContraseÃ±a: Reset database password.'
  );
}

process.exit(result.status === 0 ? 0 : result.status ?? 1);
