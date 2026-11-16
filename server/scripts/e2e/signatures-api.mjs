/**
 * E2E: validación de firmas (digital real + manuscrita con revisión del administrador).
 * Uso: node signatures-api.mjs <carpeta con PDF de prueba>   (BD temporal de CI)
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

process.on('uncaughtException', (e) => { console.log(`::error title=E2E firmas::${String(e.message).replace(/\r?\n/g, ' ').slice(0, 900)}`); process.exit(1); });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5000';
const PASS = process.env.E2E_PASSWORD;
const DIR = process.argv[2];
let step = 0;
const ok = (m) => console.log(`✅ firmas ${++step}. ${m}`);

async function api(method, p, token, body) {
  const res = await fetch(`${BASE}${p}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'x-auth-token': token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers };
}
async function login(email) {
  const r = await api('POST', '/api/auth/login', null, { email, password: PASS });
  assert.equal(r.status, 200, `login ${email}`);
  return r.body;
}
async function upload(token, file) {
  const buf = fs.readFileSync(path.join(DIR, file));
  const fd = new FormData();
  fd.append('document', new Blob([buf], { type: 'application/pdf' }), file);
  const res = await fetch(`${BASE}/api/signed-docs/upload`, { method: 'POST', headers: { 'x-auth-token': token }, body: fd });
  const body = await res.json();
  assert.equal(res.status, 200, `${file}: ${JSON.stringify(body)}`);
  return { ...body, sha: crypto.createHash('sha256').update(buf).digest('hex') };
}

const client = await login('client.e2e@example.com');
const admin = await login('admin.e2e@example.com');
const manager = await login('manager.e2e@example.com');
const sub = await login('sub.e2e@example.com');

const expected = {
  '1_sin_firma.pdf': 'Firma Manuscrita – Pendiente de Revisión',
  '2_firma_digital.pdf': 'Firma Digital – Pendiente de Revisión',
  '3_alterado_despues_de_firmar.pdf': 'Firma Inválida o Documento Alterado',
  '4_firma_falsa.pdf': 'Firma Inválida o Documento Alterado',
  '5_firma_manuscrita_escaneada.pdf': 'Firma Manuscrita – Pendiente de Revisión',
  '6_firma_ca_confianza.pdf': 'Firma Digital Válida',
};
const ids = {};
for (const [file, status] of Object.entries(expected)) {
  const r = await upload(client.token, file);
  assert.equal(r.status, status, `${file}: ${r.status} (esperado ${status}) ${JSON.stringify(r.verification)}`);
  ids[file] = r.docId;
}
ok('Cada PDF recibe el estado correcto (válida, no reconocida, alterada, falsa, manuscrita)');

let r = await api('GET', '/api/signed-docs', client.token);
assert.equal(r.status, 200);
const valid = r.body.find((d) => d.id === ids['6_firma_ca_confianza.pdf']);
assert.equal(valid.verification.signer.commonName, 'Cliente E2E');
assert.equal(valid.verification.identityMatch, 'match', 'cédula del certificado = cédula del usuario');
assert.equal(valid.verification.trusted, true);
const selfSigned = r.body.find((d) => d.id === ids['2_firma_digital.pdf']);
assert.equal(selfSigned.verification.trusted, false);
assert.equal(r.body.find((d) => d.id === ids['5_firma_manuscrita_escaneada.pdf']).fileHash.length, 64);
ok('Firmante, autoridad reconocida, coincidencia con la cédula y huella SHA-256 visibles para el usuario');

// Bandeja del administrador
r = await api('GET', '/api/admin/signatures?filter=pending', admin.token);
assert.equal(r.status, 200);
const pendingIds = r.body.documents.map((d) => d.id);
for (const f of ['1_sin_firma.pdf', '2_firma_digital.pdf', '5_firma_manuscrita_escaneada.pdf']) assert.ok(pendingIds.includes(ids[f]), `pendiente: ${f}`);
for (const f of ['3_alterado_despues_de_firmar.pdf', '4_firma_falsa.pdf', '6_firma_ca_confianza.pdf']) assert.ok(!pendingIds.includes(ids[f]), `no pendiente: ${f}`);
ok('Bandeja del administrador: solo manuscritas y no reconocidas quedan pendientes');

r = await api('POST', `/api/admin/signatures/${ids['1_sin_firma.pdf']}/review`, admin.token, { decision: 'rejected' });
assert.equal(r.status, 400, 'rechazar exige motivo');
r = await api('POST', `/api/admin/signatures/${ids['1_sin_firma.pdf']}/review`, admin.token, { decision: 'rejected', note: 'El documento no tiene firma' });
assert.equal(r.status, 200);
assert.equal(r.body.signatureStatus, 'Firma Rechazada');
r = await api('POST', `/api/admin/signatures/${ids['5_firma_manuscrita_escaneada.pdf']}/review`, admin.token, { decision: 'approved', note: 'Firma coincide con la cédula' });
assert.equal(r.body.signatureStatus, 'Firma Verificada por el Administrador');
r = await api('GET', '/api/signed-docs', client.token);
const rejected = r.body.find((d) => d.id === ids['1_sin_firma.pdf']);
assert.equal(rejected.signatureStatus, 'Firma Rechazada');
assert.equal(rejected.verification.review.note, 'El documento no tiene firma');
r = await api('GET', '/api/admin/logs?limit=100&q=SIGNED_DOC_REVIEW', admin.token);
assert.ok((r.body.logs || []).some((l) => /RECHAZÓ/.test(l.description) && /SHA-256/.test(l.description)));
ok('Administrador aprueba/rechaza (motivo obligatorio al rechazar); el usuario ve el motivo; queda en bitácora con la huella');

// Permisos
r = await api('GET', '/api/admin/signatures', manager.token);
assert.equal(r.status, 403);
r = await api('POST', `/api/admin/signatures/${ids['2_firma_digital.pdf']}/review`, client.token, { decision: 'approved' });
assert.ok([401, 403].includes(r.status));
r = await api('GET', `/api/signed-docs/download/${ids['2_firma_digital.pdf']}`, manager.token);
assert.equal(r.status, 404, 'Administrador Usuarios NO descarga documentos de otros clientes');
const subUp = await upload(sub.token, '5_firma_manuscrita_escaneada.pdf');
r = await api('GET', `/api/signed-docs/download/${subUp.docId}`, manager.token);
assert.equal(r.status, 200, 'Administrador Usuarios descarga los de su subusuario');
r = await api('GET', `/api/signed-docs/download/${ids['2_firma_digital.pdf']}`, admin.token);
assert.equal(r.status, 200);
assert.equal(r.headers.get('content-type'), 'application/pdf');
ok('Permisos: solo el administrador revisa; descargas con alcance de la Opción A');

console.log(`\nE2E firmas: ${step} verificaciones OK`);
