/**
 * E2E API: ver/editar trámites por el administrador, bitácora, edición simultánea
 * y compatibilidad con el flujo actual del usuario. Base de datos temporal de CI.
 */
import assert from 'node:assert/strict';
process.on('uncaughtException', (e) => { console.log(`::error title=E2E API::${String(e.message).replace(/\r?\n/g, ' ').slice(0, 900)}`); process.exit(1); });
import fs from 'node:fs';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5055';
const PASS = process.env.E2E_PASSWORD;
let step = 0;
const ok = (msg) => console.log(`✅ ${++step}. ${msg}`);

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-auth-token': token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}
async function login(email) {
  const r = await api('POST', '/api/auth/login', null, { email, password: PASS });
  assert.equal(r.status, 200, `login ${email}: ${JSON.stringify(r.body)}`);
  return r.body;
}
async function logs(adminToken, action) {
  const r = await api('GET', `/api/admin/logs?limit=100&q=${encodeURIComponent(action)}`, adminToken);
  assert.equal(r.status, 200);
  const rows = Array.isArray(r.body) ? r.body : (r.body.logs || r.body.rows || []);
  return rows.filter((l) => l.action === action);
}

const client = await login('client.e2e@example.com');
const admin = await login('admin.e2e@example.com');
const manager = await login('manager.e2e@example.com');
ok('Login de cliente, administrador y gerente');

// 1) El usuario crea un trámite de Corporación y guarda avance en el paso 2 de 5
const base = {
  corpNameSA: 'ALFA', corpNameCorp: '', corpNameInc: '', capitalSocial: '10000', companyActivities: 'Inversiones',
  directors: [{ entityType: 'individual', fullName: 'Ana Pérez', passport: 'A111' }, { entityType: 'individual', fullName: 'Luis Mora', passport: 'B222' }],
  dignitaries: [{ role: 'PRESIDENTE', fullName: '' }], shareholders: [{ name: '' }], signers: [{ name: '' }],
  __progress: { step: 2, totalSteps: 5, finished: false },
  __adminEditLog: [{ at: 'falso', version: 99 }], // el cliente no puede inyectar esto
};
let r = await api('POST', '/api/forms/save', client.token, { type: 'Corporación', data: base });
assert.equal(r.status, 200, JSON.stringify(r.body));
const v1 = r.body.data;
assert.equal(v1.data.__progress.step, 2);
assert.equal(v1.data.__progress.finished, false);
assert.equal(v1.data.__adminEditLog, undefined, 'el servidor descarta __adminEditLog del cliente');
ok('Usuario guarda avance (paso 2 de 5); el servidor guarda __progress y descarta metadatos falsos');

// 2) GET /api/forms/:id ahora informa la versión más reciente (campo aditivo)
r = await api('GET', `/api/forms/${v1.id}`, client.token);
assert.equal(r.status, 200);
assert.equal(r.body.latestId, v1.id);
assert.equal(r.body.latestVersion, 1);
ok('GET /api/forms/:id devuelve latestId/latestVersion');

// 3) Usuario guarda nueva versión con expectedLatestId correcto
r = await api('POST', '/api/forms/save', client.token, { id: v1.id, type: 'Corporación', expectedLatestId: v1.id, data: { ...base, corpNameSA: 'ALFA S.A.', __progress: { step: 3, totalSteps: 5 } } });
assert.equal(r.status, 200, JSON.stringify(r.body));
const v2 = r.body.data;
assert.equal(v2.data.__metadata.version, 2);
assert.equal(v2.data.__progress.step, 3);
ok('Usuario guarda versión 2 (paso 3)');

// 4) Gerente y cliente NO pueden usar el editor del administrador
r = await api('GET', `/api/admin/form-editor/${v1.id}?mode=view`, manager.token);
assert.equal(r.status, 403, `gerente: ${r.status}`);
r = await api('GET', `/api/admin/form-editor/${v1.id}?mode=view`, client.token);
assert.ok([401, 403].includes(r.status), `cliente: ${r.status}`);
r = await api('POST', `/api/admin/form-editor/${v1.id}/save`, manager.token, { data: {}, expectedLatestId: v2.id });
assert.equal(r.status, 403);
r = await api('PUT', `/api/admin/forms/${v2.id}`, manager.token, { data: { x: 1 } });
assert.equal(r.status, 403, 'edición JSON directa restringida al administrador');
ok('Gerente y cliente reciben 403 en ver/editar (incluida la edición JSON directa)');

// 5) Administrador VE (abriendo la v1): recibe la más reciente (v2) y queda en bitácora
r = await api('GET', `/api/admin/form-editor/${v1.id}?mode=view`, admin.token);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.form.id, v2.id);
assert.equal(r.body.form.version, 2);
assert.equal(r.body.requestedVersion, 1);
assert.equal(r.body.versions.length, 2);
assert.equal(r.body.owner.email, 'client.e2e@example.com');
assert.equal(r.body.form.data.__progress.step, 3);
assert.ok((await logs(admin.token, 'ADMIN_FORM_VIEW')).length >= 1, 'bitácora ADMIN_FORM_VIEW');
ok('Administrador ve el trámite (versión más reciente, avance, dueño) y queda ADMIN_FORM_VIEW');

// 6) Administrador abre para EDITAR y guarda cambios
r = await api('GET', `/api/admin/form-editor/${v2.id}?mode=edit`, admin.token);
assert.equal(r.status, 200);
assert.ok((await logs(admin.token, 'ADMIN_FORM_EDIT_OPEN')).length >= 1);
const edited = { ...r.body.form.data, directors: [{ entityType: 'individual', fullName: 'Ana Pérez', passport: 'A999' }, ...r.body.form.data.directors.slice(1)], __progress: { step: 5, totalSteps: 5, finished: true } };
r = await api('POST', `/api/admin/form-editor/${v2.id}/save`, admin.token, { data: edited, expectedLatestId: v2.id });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.form.version, 3);
assert.equal(r.body.changes, 1);
const v3id = r.body.form.id;
const v3 = r.body.payload.form;
assert.equal(v3.data.__progress.step, 3, 'el avance del usuario no cambia por la edición del admin');
assert.equal(v3.data.__adminEditLog.length, 1);
assert.equal(v3.data.__adminEditLog[0].adminEmail, 'admin.e2e@example.com');
assert.equal(v3.data.__metadata.editedBy.role, 'admin');
const editLogs = await logs(admin.token, 'ADMIN_FORM_EDIT');
assert.ok(editLogs.some((l) => /directors#1\.passport: A111 → A999/.test(l.description)), 'bitácora con valor anterior y nuevo');
ok('Administrador edita: nueva versión v3 a nombre del usuario, rastro __adminEditLog y bitácora "directors#1.passport: A111 → A999"');

// 7) Sin cambios: no crea versión
r = await api('POST', `/api/admin/form-editor/${v3id}/save`, admin.token, { data: v3.data, expectedLatestId: v3id });
assert.equal(r.status, 200);
assert.equal(r.body.unchanged, true);
ok('Guardar sin cambios no crea una versión nueva');

// 8) Edición simultánea: admin con versión vieja -> 409
r = await api('POST', `/api/admin/form-editor/${v2.id}/save`, admin.token, { data: { ...edited, corpNameSA: 'OTRO' }, expectedLatestId: v2.id });
assert.equal(r.status, 409);
assert.equal(r.body.latestId, v3id);
ok('Administrador con versión desactualizada recibe 409 (no sobrescribe)');

// 9) Edición simultánea: el usuario tenía abierta la v2 -> 409 con aviso del administrador
r = await api('POST', '/api/forms/save', client.token, { id: v2.id, type: 'Corporación', expectedLatestId: v2.id, data: { ...base, corpNameSA: 'CAMBIO USUARIO' } });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.match(r.body.msg, /administrador/i);
ok('Usuario con versión desactualizada recibe 409: "El administrador modificó este trámite…"');

// 10) Usuario abre la versión actual, ve el rastro y guarda: se conserva el rastro
r = await api('GET', `/api/forms/${v3id}`, client.token);
assert.equal(r.body.latestId, v3id);
assert.equal(r.body.data.__adminEditLog.length, 1);
r = await api('POST', '/api/forms/save', client.token, { id: v3id, type: 'Corporación', expectedLatestId: v3id, data: { ...r.body.data, companyActivities: 'Inversiones y bienes', __adminEditLog: [] } });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.data.data.__metadata.version, 4);
assert.equal(r.body.data.data.__adminEditLog.length, 1, 'el usuario no puede borrar el rastro');
ok('Usuario guarda sobre la versión editada (v4); el rastro del administrador se conserva');

// 11) Compatibilidad: restaurar desde el historial (sin expectedLatestId) sigue funcionando
r = await api('POST', '/api/forms/save', client.token, { id: v1.id, type: 'Corporación', data: { ...base } });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.data.data.__metadata.version, 5, 'numeración tras la versión más reciente');
const corpLatestId = r.body.data.id;
ok('Restaurar una versión antigua sin expectedLatestId sigue funcionando (v5)');

// 12) Lista del usuario incluye la marca de edición del administrador
r = await api('GET', '/api/forms/my-forms', client.token);
assert.equal(r.status, 200);
assert.ok(r.body.some((f) => Array.isArray(f.data?.__adminEditLog) && f.data.__adminEditLog.length));
ok('my-forms expone la marca de edición del administrador');

// 13) Otros tipos: KYC Individual
r = await api('POST', '/api/forms/save', client.token, { type: 'Cumplimiento Individual', data: { fullName: 'Ana Pérez', passport: 'A111', pep: 'No', fundsSource: [], __progress: { step: 1, totalSteps: 4 } } });
assert.equal(r.status, 200);
const kyc = r.body.data;
r = await api('GET', `/api/admin/form-editor/${kyc.id}?mode=view`, admin.token);
assert.equal(r.status, 200);
assert.equal(r.body.form.type, 'Cumplimiento Individual');
ok('Editor del administrador funciona con KYC Individual');

// 13b) KYC Individual con el formato de la plantilla oficial → PDF
r = await api('POST', '/api/forms/save', client.token, { type: 'Cumplimiento Individual', data: {
  panamaEntityName: 'Atlántico S.A.', applicantRoles: ['director', 'shareholder'], firstName: 'Ana', secondName: 'María', lastName: 'Pérez Gil',
  fullName: 'Ana María Pérez Gil', birthDate: '1990-01-01', nationality: 'Panameña', birthPlace: 'Panamá', passport: 'A222',
  address: 'Calle 1', maritalStatus: 'Soltero(a)', phone: '+507 1', email: 'ana@test.com', taxResidenceCountries: 'Panamá',
  otherTaxResidence: 'No', usPerson: 'Sí', usTin: '123-45-6789', sourceOfWealth: 'Salario', pep: 'No', offenceConvicted: 'No',
  offenceBankrupt: 'No', offenceInvestigation: 'No', certifiedDocs: ['passport', 'proofOfAddress', 'cv', 'w9'], declarationName: 'Ana María Pérez Gil', declarationDate: '2026-11-15',
  __progress: { step: 4, totalSteps: 4, finished: true } } });
assert.equal(r.status, 200);
const kycNew = r.body.data;
for (const [label, id] of [['plantilla oficial', kycNew.id], ['formato anterior', kyc.id]]) {
  const res = await fetch(`${BASE}/api/forms/generate-pdf/${id}`, { headers: { 'x-auth-token': client.token } });
  const buf = Buffer.from(await res.arrayBuffer());
  assert.equal(res.status, 200, `PDF KYCI (${label}): ${res.status} ${buf.toString().slice(0, 200)}`);
  assert.equal(buf.subarray(0, 4).toString(), '%PDF', `PDF KYCI (${label}) válido`);
}
ok('KYC Individual: PDF de la plantilla oficial y de trámites antiguos se generan');

// 13c) KYC Entities: formato de la plantilla oficial y formato anterior → PDF (ES y EN)
r = await api('POST', '/api/forms/save', client.token, { type: 'Cumplimiento Entidades', data: {
  panamaEntityName: 'Atlántico S.A.', legalName: 'Atlantic Holdings Ltd.', incorporationDate: '2015-06-01', jurisdiction: 'BVI',
  registrationNumber: 'BVI-1', registeredAddress: 'Road Town', phone: '+1 284', businessActivity: 'Holding',
  offenceConvicted: 'No', offenceInvestigation: 'No', applicantType: 'trustFoundation', trustDocs: ['trustDeed', 'dueDiligence'],
  settlorNameAddress: 'Juan Pérez, Quito', trusteesNameAddress: 'Trust Co.', beneficiary1: 'María Pérez',
  fatcaClassification: 'passiveNFFE', usEntity: 'No', otherTaxResidence: 'No', declarationName: 'Pedro Ruiz', declarationDate: '2026-11-15',
  __progress: { step: 4, totalSteps: 4, finished: true } } });
assert.equal(r.status, 200);
const kyceNew = r.body.data;
r = await api('POST', '/api/forms/save', client.token, { type: 'Cumplimiento Entidades', data: {
  legalName: 'Vieja S.A.', entityType: 'S.A.', email: 'vieja@test.com', pep: 'No', fundsSource: ['Negocios'], declarationName: 'Ana',
  __progress: { step: 1, totalSteps: 3 } } });
assert.equal(r.status, 200);
const kyceOld = r.body.data;
for (const [label, id, lang] of [['plantilla ES', kyceNew.id, 'es'], ['plantilla EN', kyceNew.id, 'en'], ['formato anterior', kyceOld.id, 'es']]) {
  const res = await fetch(`${BASE}/api/forms/generate-pdf/${id}?lang=${lang}`, { headers: { 'x-auth-token': client.token } });
  const buf = Buffer.from(await res.arrayBuffer());
  assert.equal(res.status, 200, `PDF KYCE (${label}): ${res.status} ${buf.toString().slice(0, 200)}`);
  assert.equal(buf.subarray(0, 4).toString(), '%PDF', `PDF KYCE (${label}) válido`);
}
ok('KYC Entities: PDF de la plantilla (español e inglés) y de trámites antiguos se generan');

// 13e) Nombre personalizado del trámite: lo pone el dueño, no crea versión y pasa a la siguiente
{
  let lr = await api('PATCH', `/api/forms/${kyceNew.id}/label`, client.token, { label: '  Atlántico – <b>banco</b>  ' });
  assert.equal(lr.status, 200, `label: ${lr.status}`);
  assert.equal(lr.body.label, 'Atlántico – bbanco/b');
  let mine = await api('GET', '/api/forms/my-forms', client.token);
  const before = mine.body.filter((f) => (f.parentId || f.id) === (kyceNew.parentId || kyceNew.id) || f.id === kyceNew.id);
  assert.ok(before.some((f) => f.data.__label === 'Atlántico – bbanco/b'), 'el nombre aparece en mis trámites');
  const versionsBefore = mine.body.length;
  // otro usuario no puede renombrarlo
  lr = await api('PATCH', `/api/forms/${kyceNew.id}/label`, admin.token, { label: 'X' });
  assert.equal(lr.status, 404, 'solo el dueño pone el nombre');
  // guardar una nueva versión conserva el nombre aunque el cliente no lo envíe (o intente cambiarlo)
  const sv = await api('POST', '/api/forms/save', client.token, { id: kyceNew.id, type: 'Cumplimiento Entidades', data: { ...kyceNew.data, __label: 'INYECTADO', phone: '+1 999' } });
  assert.equal(sv.status, 200);
  mine = await api('GET', '/api/forms/my-forms', client.token);
  assert.equal(mine.body.length, versionsBefore + 1, 'renombrar no creó versión; guardar sí');
  const latestKyce = mine.body.find((f) => f.id === sv.body.data.id);
  assert.equal(latestKyce.data.__label, 'Atlántico – bbanco/b', 'el nombre pasa a la nueva versión y no se puede inyectar');
  // quitar el nombre
  lr = await api('PATCH', `/api/forms/${sv.body.data.id}/label`, client.token, { label: '' });
  assert.equal(lr.status, 200);
  assert.equal(lr.body.label, '');
}
ok('Trámites: nombre personalizado (dueño, sin versión nueva, se conserva, no se inyecta)');

// 13d) Consultas → Excel (mismos permisos que el reporte PDF)
{
  const res = await fetch(`${BASE}/api/admin/export-search-xlsx?nombres=Ana`, { headers: { 'x-auth-token': admin.token } });
  const buf = Buffer.from(await res.arrayBuffer());
  assert.equal(res.status, 200, `Excel: ${res.status} ${buf.toString().slice(0, 200)}`);
  assert.match(res.headers.get('content-type') || '', /spreadsheetml/);
  assert.equal(buf.subarray(0, 2).toString(), 'PK', 'Excel es un .xlsx (ZIP)');
  assert.ok(buf.includes(Buffer.from('xl/worksheets/sheet1.xml')), 'Excel con hojas');
  const denied = await fetch(`${BASE}/api/admin/export-search-xlsx?nombres=Ana`, { headers: { 'x-auth-token': client.token } });
  assert.equal(denied.status, 403, 'cliente NO descarga el Excel');
  assert.ok((await logs(admin.token, 'ADMIN_EXPORT_XLSX')).length > 0, 'la descarga queda en la bitácora');
}
ok('Consultas: el administrador descarga el Excel, el cliente no, y queda en la bitácora');

// 14) Opción A: "Administrador Usuarios" (manager) limitado a él y sus subusuarios
for (const path of ['/api/admin/users', '/api/admin/logs', '/api/admin/search-person?nombres=Ana', '/api/admin/export-search-xlsx?nombres=Ana', `/api/admin/user-forms/${admin.user.id}`]) {
  r = await api('GET', path, manager.token);
  assert.equal(r.status, 403, `manager ${path}: ${r.status}`);
}
r = await api('DELETE', `/api/admin/forms/${v1.id}`, manager.token);
assert.equal(r.status, 403);
r = await api('GET', '/api/admin/users', admin.token);
assert.equal(r.status, 200, 'el administrador conserva el acceso');
ok('Administrador Usuarios: 403 en todo el API del panel de administrador; el administrador sigue con acceso');

const sub = await login('sub.e2e@example.com');
r = await api('POST', '/api/forms/save', sub.token, { type: 'Cumplimiento Individual', data: { fullName: 'Sub Uno', passport: 'S1', pep: 'No', fundsSource: [] } });
assert.equal(r.status, 200);
const subForm = r.body.data;
r = await api('POST', '/api/forms/save', sub.token, { type: 'Cumplimiento Individual', data: { fullName: 'Sub Dos', passport: 'S2', pep: 'No', fundsSource: [] } });
const subForm2 = r.body.data;
r = await api('GET', `/api/forms/${subForm.id}`, manager.token);
assert.equal(r.status, 200, 'manager ve el trámite de su subusuario');
r = await api('GET', `/api/forms/${v1.id}`, manager.token);
assert.equal(r.status, 404, 'manager NO ve trámites de otros clientes');
r = await api('GET', `/api/forms/generate-pdf/${v1.id}`, manager.token);
assert.equal(r.status, 404, 'manager NO descarga PDF de otros clientes');
r = await api('DELETE', `/api/forms/${v1.id}`, manager.token);
assert.equal(r.status, 404, 'manager NO elimina trámites de otros clientes');
r = await api('GET', `/api/forms/${v1.id}`, client.token);
assert.equal(r.status, 200, 'el trámite del cliente sigue existiendo');
r = await api('DELETE', `/api/forms/${subForm2.id}`, manager.token);
assert.equal(r.status, 200, 'manager puede eliminar trámites de su subusuario');
r = await api('GET', `/api/forms/${subForm.id}`, client.token);
assert.equal(r.status, 404, 'un cliente no ve trámites de otro usuario');
r = await api('GET', `/api/forms/${subForm.id}`, admin.token);
assert.equal(r.status, 200, 'el administrador ve todo');
ok('Administrador Usuarios: ve/elimina solo lo suyo y de sus subusuarios; no toca trámites de otros clientes');

// 15) Cambio de rol por el administrador conserva el vínculo con el Administrador Usuarios
r = await api('PUT', `/api/admin/users/${sub.user.id}/role`, admin.token, { roleOverride: 'client' });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await api('GET', `/api/forms/${subForm.id}`, manager.token);
assert.equal(r.status, 200, 'tras el cambio de rol el Administrador Usuarios sigue viendo a su subusuario');
r = await api('PUT', `/api/admin/users/${sub.user.id}/role`, manager.token, { roleOverride: 'client' });
assert.equal(r.status, 403, 'solo el administrador cambia roles');
ok('Cambio de rol por el administrador conserva el vínculo del subusuario; el Administrador Usuarios no puede cambiar roles');

fs.writeFileSync(process.env.E2E_OUT || 'e2e-ids.json', JSON.stringify({ corpLatestId, v3id, kycId: kyc.id, kycNewId: kycNew.id, kyceNewId: kyceNew.id, kyceOldId: kyceOld.id, adminToken: admin.token, clientToken: client.token, admin: admin.user, client: client.user }));
console.log(`\nE2E API: ${step} verificaciones OK`);
