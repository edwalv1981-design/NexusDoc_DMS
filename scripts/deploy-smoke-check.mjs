#!/usr/bin/env node
/**
 * Smoke check post-deploy para NexusDoc DMS.
 * Uso: DEPLOY_URL o SMOKE_BASE_URL; opcional SMOKE_TOKEN para API autenticada.
 */

const DEFAULT_BASE = 'https://nexusdocdms-production.up.railway.app';
const TIMEOUT_MS = 15_000;

const baseUrl = (process.env.DEPLOY_URL || process.env.SMOKE_BASE_URL || DEFAULT_BASE).replace(
  /\/$/,
  ''
);
const smokeToken = process.env.SMOKE_TOKEN || '';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

function ok(label, detail = '') {
  const extra = detail ? dim(` — ${detail}`) : '';
  console.log(`${green('OK')}   ${label}${extra}`);
}

function fail(label, detail = '') {
  const extra = detail ? dim(` — ${detail}`) : '';
  console.log(`${red('FALLO')} ${label}${extra}`);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkHealth() {
  const label = 'GET /health → 200 y cuerpo vivo';
  try {
    const res = await fetchWithTimeout(`${baseUrl}/health`);
    const body = await res.text();
    const alive =
      body.includes('OK') || /servidor\s+vivo/i.test(body);
    if (res.status === 200 && alive) {
      ok(label, `status ${res.status}`);
      return true;
    }
    fail(label, `status ${res.status}, cuerpo: ${body.slice(0, 80)}`);
    return false;
  } catch (err) {
    fail(label, err.name === 'AbortError' ? 'timeout 15s' : err.message);
    return false;
  }
}

async function checkRoot() {
  const label = 'GET / → 200';
  try {
    const res = await fetchWithTimeout(`${baseUrl}/`);
    if (res.status === 200) {
      ok(label, `status ${res.status}`);
      return true;
    }
    fail(label, `status ${res.status}`);
    return false;
  } catch (err) {
    fail(label, err.name === 'AbortError' ? 'timeout 15s' : err.message);
    return false;
  }
}

async function checkDashboard() {
  const label = 'GET /dashboard → 200 HTML';
  try {
    const res = await fetchWithTimeout(`${baseUrl}/dashboard`);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const isHtml = ct.includes('text/html');
    if (res.status === 200 && isHtml) {
      ok(label, ct.split(';')[0]);
      return true;
    }
    fail(label, `status ${res.status}, content-type: ${ct || '(vacío)'}`);
    return false;
  } catch (err) {
    fail(label, err.name === 'AbortError' ? 'timeout 15s' : err.message);
    return false;
  }
}

async function checkTemplatesStatus() {
  const path = '/api/forms/templates/status';
  const label = smokeToken
    ? `GET ${path} → 200 (con SMOKE_TOKEN)`
    : `GET ${path} → 401 o 200 (sin token)`;
  const headers = {};
  if (smokeToken) headers['x-auth-token'] = smokeToken;

  try {
    const res = await fetchWithTimeout(`${baseUrl}${path}`, { headers });
    const allowed = smokeToken
      ? res.status === 200
      : res.status === 401 || res.status === 200;
    if (allowed) {
      ok(label, `status ${res.status}`);
      return true;
    }
    fail(label, `status ${res.status} (esperado ${smokeToken ? '200' : '401 o 200'})`);
    return false;
  } catch (err) {
    fail(label, err.name === 'AbortError' ? 'timeout 15s' : err.message);
    return false;
  }
}

async function main() {
  const ts = new Date().toISOString();
  console.log(bold('\nNexusDoc DMS — smoke post-deploy\n'));
  console.log(`URL:       ${baseUrl}`);
  console.log(`Timestamp: ${ts}`);
  if (smokeToken) console.log(dim('SMOKE_TOKEN: configurado'));
  console.log('');

  const results = await Promise.all([
    checkHealth(),
    checkRoot(),
    checkDashboard(),
    checkTemplatesStatus(),
  ]);

  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log('');
  if (passed === total) {
    console.log(green(bold(`Resumen: ${passed}/${total} comprobaciones OK`)));
    process.exit(0);
  }
  console.log(red(bold(`Resumen: ${passed}/${total} OK — revisar fallos arriba`)));
  process.exit(1);
}

main();
