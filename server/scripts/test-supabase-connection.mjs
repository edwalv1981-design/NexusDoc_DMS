#!/usr/bin/env node
/**
 * Prueba DATABASE_URL (solo si está definida): Session pooler aws-0 en 5432 y 6543.
 * No imprime contraseña.
 */
import { config as loadDotenv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { prepareDatabaseUrlForPg } = require('../config/normalizeDatabaseUrl.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
loadDotenv({ path: path.join(serverRoot, '.env') });

const raw = process.env.DATABASE_URL?.trim();
if (!raw) {
  console.error('DATABASE_URL no definida. Cree server/.env o exporte la variable.');
  process.exit(1);
}

function mask(url) {
  try {
    const u = new URL(url.replace(/^postgresql:/i, 'postgres:'));
    return `${u.protocol}//${u.username}:***@${u.hostname}:${u.port || '5432'}${u.pathname}${u.search}`;
  } catch {
    return '(url invalida)';
  }
}

function withPort(url, port) {
  const u = new URL(url.replace(/^postgresql:/i, 'postgres:'));
  u.port = String(port);
  return u.toString();
}

const host = 'aws-0-us-east-1.pooler.supabase.com';
const ref = process.env.SUPABASE_PROJECT_REF?.trim() || 'oxpohwcfujrakhwxfuxo';
const base = prepareDatabaseUrlForPg(raw.includes(host) ? raw : withPort(raw.replace(/@[^/]+/, `@${host}`), 5432));

async function tryConnect(label, url) {
  const conn = prepareDatabaseUrlForPg(url);
  console.log(`\n[test] ${label}: ${mask(conn)}`);
  const client = new pg.Client({ connectionString: conn });
  try {
    await client.connect();
    await client.query('SELECT 1 AS ok');
    await client.end();
    console.log('[test] OK');
    return true;
  } catch (e) {
    console.error('[test] FAIL:', e.message);
    try {
      await client.end();
    } catch {}
    return false;
  }
}

let ok543 = await tryConnect('pooler :5432 (Session)', withPort(base, 5432));
let ok654 = await tryConnect('pooler :6543 (Transaction)', withPort(base, 6543));
process.exit(ok543 || ok654 ? 0 : 1);
