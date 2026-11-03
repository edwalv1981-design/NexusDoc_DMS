#!/usr/bin/env node
/**
 * NexusDoc DMS — escaneo de seguridad externo (caja negra) del sitio publicado.
 *
 * Solo hace peticiones de LECTURA y un intento de login con un correo
 * inexistente (no toca usuarios ni datos reales). Pensado para GitHub Actions:
 *   node scripts/security-scan.mjs [dominio1 dominio2 ...]
 *
 * Revisa: redirección HTTP→HTTPS, certificado TLS y versiones antiguas,
 * cabeceras de seguridad, archivos sensibles expuestos, source maps y secretos
 * en el JS público, protección de la API sin token, CORS, mensajes de error y
 * rate limit del login.
 */
import tls from 'node:tls';
import fs from 'node:fs';

const DEFAULT_DOMAINS = [
  'nexusdocdms-production.up.railway.app',
  'nexusdoc.online',
  'www.nexusdoc.online',
];
const domains = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_DOMAINS;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 NexusDocSecurityScan';

const ICON = { OK: '✅', WARN: '⚠️', FAIL: '❌', INFO: 'ℹ️' };

async function req(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout || 15000);
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      ...opts,
      headers: { 'User-Agent': UA, ...(opts.headers || {}) },
      signal: controller.signal,
    });
    const body = opts.method === 'HEAD' ? '' : await res.text();
    return { status: res.status, headers: res.headers, body };
  } catch (err) {
    return { status: 0, headers: new Headers(), body: '', error: err.cause?.code || err.name || err.message };
  } finally {
    clearTimeout(timer);
  }
}

function tlsProbe(host, { minVersion, maxVersion } = {}) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, minVersion, maxVersion, timeout: 10000 }, () => {
      const cert = socket.getPeerCertificate();
      const out = { ok: true, protocol: socket.getProtocol(), authorized: socket.authorized, authError: socket.authorizationError, cert };
      socket.end();
      resolve(out);
    });
    socket.on('error', (e) => resolve({ ok: false, error: e.code || e.message }));
    socket.on('timeout', () => { socket.destroy(); resolve({ ok: false, error: 'timeout' }); });
  });
}

async function scanDomain(host) {
  const results = [];
  const add = (status, check, detail = '') => results.push({ status, check, detail });
  const base = `https://${host}`;

  // 1) Disponibilidad
  const root = await req(`${base}/`);
  if (root.status === 0) {
    add('INFO', 'Dominio no responde por HTTPS', root.error);
    return results;
  }
  add(root.status === 200 ? 'OK' : 'WARN', 'Página principal', `HTTP ${root.status}`);

  // 2) HTTP -> HTTPS
  const http = await req(`http://${host}/`);
  const loc = http.headers.get('location') || '';
  if ([301, 302, 307, 308].includes(http.status) && loc.startsWith('https://')) add('OK', 'HTTP redirige a HTTPS', `${http.status} → ${loc}`);
  else if (http.status === 0) add('OK', 'HTTP (puerto 80) cerrado', http.error);
  else add('FAIL', 'HTTP no redirige a HTTPS', `HTTP ${http.status}`);

  // 3) TLS
  const t = await tlsProbe(host);
  if (!t.ok) add('FAIL', 'Conexión TLS', t.error);
  else {
    const days = Math.floor((new Date(t.cert.valid_to) - Date.now()) / 86400000);
    add(t.authorized ? 'OK' : 'FAIL', 'Certificado válido y de confianza', t.authorized ? `${t.cert.issuer?.O || t.cert.issuer?.CN || ''}` : t.authError);
    add(days > 14 ? 'OK' : 'WARN', 'Vencimiento del certificado', `${days} días restantes (${t.cert.valid_to})`);
    add(['TLSv1.2', 'TLSv1.3'].includes(t.protocol) ? 'OK' : 'FAIL', 'Protocolo TLS negociado', t.protocol);
  }
  for (const v of ['TLSv1', 'TLSv1.1']) {
    const old = await tlsProbe(host, { minVersion: v, maxVersion: v });
    add(old.ok ? 'FAIL' : 'OK', `${v.replace('TLSv1', 'TLS 1.0').replace('TLS 1.0.1', 'TLS 1.1')} rechazado`, old.ok ? 'el servidor ACEPTA un protocolo obsoleto' : 'no negociable');
  }

  // 4) Cabeceras de seguridad
  const h = root.headers;
  const hsts = h.get('strict-transport-security');
  if (!hsts) add('FAIL', 'HSTS (Strict-Transport-Security)', 'ausente');
  else {
    const maxAge = Number((hsts.match(/max-age=(\d+)/) || [])[1] || 0);
    add(maxAge >= 15552000 ? 'OK' : 'WARN', 'HSTS', hsts);
  }
  const csp = h.get('content-security-policy');
  if (!csp) add('FAIL', 'Content-Security-Policy', 'ausente');
  else add(/script-src[^;]*'unsafe-inline'/.test(csp) ? 'WARN' : 'OK', 'Content-Security-Policy', /script-src[^;]*'unsafe-inline'/.test(csp) ? "presente, pero script-src permite 'unsafe-inline'" : 'presente');
  const xfo = h.get('x-frame-options');
  add(xfo || /frame-ancestors/.test(csp || '') ? 'OK' : 'FAIL', 'Protección clickjacking (X-Frame-Options / frame-ancestors)', xfo || 'frame-ancestors en CSP');
  add(h.get('x-content-type-options') === 'nosniff' ? 'OK' : 'FAIL', 'X-Content-Type-Options', h.get('x-content-type-options') || 'ausente');
  add(h.get('referrer-policy') ? 'OK' : 'WARN', 'Referrer-Policy', h.get('referrer-policy') || 'ausente');
  add(h.get('permissions-policy') ? 'OK' : 'WARN', 'Permissions-Policy', h.get('permissions-policy') || 'ausente');
  add(h.get('x-powered-by') ? 'WARN' : 'OK', 'X-Powered-By oculto', h.get('x-powered-by') || 'no expuesto');
  const server = h.get('server');
  add(server && /\d/.test(server) ? 'WARN' : 'INFO', 'Cabecera Server', server || 'no expuesta');
  const setCookie = h.get('set-cookie');
  if (setCookie) add(/secure/i.test(setCookie) && /httponly/i.test(setCookie) ? 'OK' : 'WARN', 'Cookies con Secure/HttpOnly', setCookie.slice(0, 120));

  // 5) Archivos sensibles (el SPA devuelve index.html para rutas desconocidas: se compara contra la portada)
  const indexBody = root.body;
  const sensitive = ['/.env', '/server/.env', '/.git/HEAD', '/.git/config', '/package.json', '/server/package.json',
    '/server_log.txt', '/server/server_log.txt', '/init.sql', '/MANUAL_CONSULTAS_SQL.md', '/docker-compose.yml', '/Dockerfile',
    '/templates/PTLC.pdf', '/server/templates/PTLC.pdf', '/api/debug-pdf', '/backup.sql', '/.DS_Store'];
  const exposed = [];
  for (const p of sensitive) {
    const r = await req(`${base}${p}`);
    const isSpa = r.body === indexBody || /<div id="root"/.test(r.body);
    if (r.status === 200 && !isSpa && r.body.length > 0) exposed.push(`${p} (${r.body.length} bytes)`);
  }
  add(exposed.length ? 'FAIL' : 'OK', 'Archivos sensibles no expuestos', exposed.length ? exposed.join(', ') : `${sensitive.length} rutas probadas`);

  // 6) JS público: source maps y secretos
  const scripts = [...indexBody.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]);
  let mapsExposed = 0;
  const secretHits = [];
  for (const src of scripts.slice(0, 5)) {
    const url = src.startsWith('http') ? src : `${base}${src}`;
    const js = await req(url, { timeout: 30000 });
    const mapRes = await req(`${url}.map`);
    if (mapRes.status === 200 && mapRes.body.startsWith('{')) mapsExposed++;
    const patterns = {
      'Resend API key': /re_[A-Za-z0-9]{8}_[A-Za-z0-9]{16,}/,
      'Cadena de conexión Postgres': /postgres(ql)?:\/\/[^\s"'`]+:[^\s"'`@]+@/,
      'Clave privada': /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      'JWT secret': /JWT_SECRET\s*[:=]\s*["'][^"']{8,}/,
      'Supabase service_role': /service_role/,
      'AWS key': /AKIA[0-9A-Z]{16}/,
    };
    for (const [name, rx] of Object.entries(patterns)) if (rx.test(js.body)) secretHits.push(`${name} en ${src}`);
    const pw = js.body.match(/Admin1234\*|Pichincha2026|Master2026\*/);
    if (pw) secretHits.push(`contraseña conocida en ${src}`);
  }
  add(mapsExposed ? 'WARN' : 'OK', 'Source maps no públicos', mapsExposed ? `${mapsExposed} .map accesibles (exponen el código fuente)` : `${scripts.length} scripts revisados`);
  add(secretHits.length ? 'FAIL' : 'OK', 'Sin secretos en el JavaScript público', secretHits.join('; ') || 'ningún patrón encontrado');

  // 7) API protegida sin token
  const protectedEndpoints = ['/api/auth/me', '/api/admin/users', '/api/admin/logs', '/api/forms/my-forms', '/api/documents', '/api/signed-docs', '/api/admin/templates', '/api/manager/sub-users'];
  const open = [];
  for (const p of protectedEndpoints) {
    const r = await req(`${base}${p}`);
    if (r.status !== 401 && r.status !== 403) open.push(`${p} → ${r.status}`);
  }
  add(open.length ? 'FAIL' : 'OK', 'API exige autenticación', open.join(', ') || `${protectedEndpoints.length} endpoints responden 401/403 sin token`);
  const forged = await req(`${base}/api/admin/users`, { headers: { Authorization: 'Bearer eyJhbGciOiJub25lIn0.eyJ1c2VyIjp7ImlkIjoiMSIsInJvbGUiOiJhZG1pbiJ9fQ.' } });
  add(forged.status === 401 ? 'OK' : 'FAIL', 'Rechaza token falsificado (alg=none)', `HTTP ${forged.status}`);

  // 8) CORS
  const evil = await req(`${base}/api/auth/me`, { headers: { Origin: 'https://evil.example' } });
  const acao = evil.headers.get('access-control-allow-origin');
  add(acao === '*' || acao === 'https://evil.example' ? 'FAIL' : 'OK', 'CORS no acepta orígenes ajenos', acao ? `ACAO=${acao}` : `sin ACAO (HTTP ${evil.status})`);
  if (/at [A-Za-z]+ \(|node_modules|\/app\/server/.test(evil.body)) add('FAIL', 'Error CORS sin traza interna', 'la respuesta incluye stack trace');

  // 9) Login: mensajes genéricos, inyección y rate limit (correo inexistente: no afecta cuentas reales)
  const login = await req(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'security-scan@example.invalid', password: 'x-invalid-x' }),
  });
  add(login.status === 401 ? 'OK' : 'WARN', 'Login con usuario inexistente', `HTTP ${login.status} ${login.body.slice(0, 80)}`);
  const rl = login.headers.get('ratelimit-limit') || login.headers.get('ratelimit') || login.headers.get('x-ratelimit-limit');
  add(rl ? 'OK' : 'WARN', 'Rate limit activo en login', rl ? `límite=${rl}` : 'sin cabeceras RateLimit');
  const inj = await req(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "' OR '1'='1' --", password: "' OR '1'='1" }),
  });
  add(inj.status === 401 || inj.status === 400 ? 'OK' : 'FAIL', 'Login resiste inyección SQL', `HTTP ${inj.status}`);
  const bad = await req(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"email":' });
  add(/at [A-Za-z]+ \(|node_modules|SequelizeDatabaseError/.test(bad.body) ? 'FAIL' : 'OK', 'Errores sin detalles internos', `JSON malformado → HTTP ${bad.status}`);

  // 10) Extras informativos
  const sec = await req(`${base}/.well-known/security.txt`);
  add(sec.status === 200 && !/<div id="root"/.test(sec.body) ? 'OK' : 'INFO', 'security.txt', sec.status === 200 && !/<div id="root"/.test(sec.body) ? 'presente' : 'no publicado (opcional)');

  return results;
}

function toMarkdown(host, results) {
  const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  let md = `### ${host}\n\n${ICON.OK} ${counts.OK || 0}  ${ICON.WARN} ${counts.WARN || 0}  ${ICON.FAIL} ${counts.FAIL || 0}\n\n| Estado | Control | Detalle |\n|---|---|---|\n`;
  for (const r of results) md += `| ${ICON[r.status]} ${r.status} | ${r.check} | ${String(r.detail).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |\n`;
  return md + '\n';
}

const all = {};
let summary = `## NexusDoc DMS — escaneo de seguridad (${new Date().toISOString()})\n\n`;
for (const host of domains) {
  const results = await scanDomain(host);
  all[host] = results;
  const md = toMarkdown(host, results);
  summary += md;
  console.log(md);
  // Anotación (legible por API aunque los logs no lo sean)
  const enc = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  const lines = results.map((r) => `${r.status} | ${r.check} | ${r.detail}`).join('\n');
  console.log(`::notice title=Security scan ${host}::${enc(lines)}`);
}
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
fs.writeFileSync('security-scan-report.json', JSON.stringify(all, null, 2));
