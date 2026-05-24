#!/usr/bin/env node
/**
 * Migraciones vía conexión DIRECTA Supabase (db.PROJECT_REF.supabase.co:5432, usuario postgres).
 * Contraseña: SUPABASE_DB_PASSWORD o extraída de DATABASE_URL en server/.env
 */
import { config as loadDotenv } from 'dotenv';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
loadDotenv({ path: path.join(serverRoot, '.env') });

function projectRefFromUrl(raw) {
  if (!raw?.trim()) return '';
  const normalized = raw.trim().replace(/^postgresql:/i, 'postgres:');
  const m = normalized.match(/^postgres:\/\/([^@]+)@/i);
  if (!m) return '';
  const userPart = decodeURIComponent(m[1].split(':')[0] || '');
  const refMatch = userPart.match(/^postgres\.([a-z0-9]+)$/i);
  return refMatch ? refMatch[1] : '';
}

const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  projectRefFromUrl(process.env.DATABASE_URL) ||
  'ohwqfujrakhwxfuxo';
const directHost = `db.${projectRef}.supabase.co`;

function passwordFromDatabaseUrl(raw) {
  if (!raw?.trim()) return '';
  const normalized = raw.trim().replace(/^postgresql:/i, 'postgres:');
  const m = normalized.match(/^postgres:\/\/([^@]+)@/i);
  if (!m) return '';
  const userPart = m[1];
  const colon = userPart.indexOf(':');
  if (colon < 0) return '';
  return decodeURIComponent(userPart.slice(colon + 1));
}

const password =
  process.env.SUPABASE_DB_PASSWORD?.trim() ||
  passwordFromDatabaseUrl(process.env.DATABASE_URL);

if (!password) {
  console.error(
    '❌ Defina SUPABASE_DB_PASSWORD o DATABASE_URL con contraseña en server/.env'
  );
  process.exit(1);
}

const enc = encodeURIComponent(password);
process.env.DATABASE_URL = `postgres://postgres:${enc}@${directHost}:5432/postgres?sslmode=require`;
process.env.SUPABASE_PROJECT_REF = projectRef;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log(`[migrate:direct] ${directHost}:5432 usuario=postgres ref=${projectRef}`);

const result = spawnSync('node', ['scripts/migrate-with-url.mjs', ...process.argv.slice(2)], {
  cwd: serverRoot,
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status === 0 ? 0 : result.status ?? 1);
