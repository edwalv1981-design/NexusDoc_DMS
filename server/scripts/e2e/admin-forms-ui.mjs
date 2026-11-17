/**
 * E2E en navegador (Chromium): vista y edición del administrador + aviso al usuario.
 * Uso: node admin-forms-ui.mjs <ruta e2e-ids.json>   (E2E_BASE_URL, SHOTS_DIR)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5055';
const ids = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const SHOTS = process.env.SHOTS_DIR || 'e2e-shots';
fs.mkdirSync(SHOTS, { recursive: true });

let n = 0;
let stage = 'inicio';
const ok = (m) => console.log(`✅ UI ${++n}. ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); console.log(`::error title=E2E UI::${String(m).replace(/\r?\n/g, ' ').slice(0, 900)}`); process.exitCode = 1; };
const expect = (cond, m) => (cond ? ok(m) : fail(m));

const browser = await chromium.launch();
// UA de navegador normal: el middleware anti-bots bloquea "HeadlessChrome" en /api.
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: 'es-EC',
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
});
const page = await ctx.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`JS: ${e.message}`));
page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) problems.push(`CSP: ${m.text().slice(0, 160)}`); });

async function loginAs(token, user) {
  await page.goto(`${BASE}/`);
  await page.evaluate(([t, u]) => { localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)); }, [token, user]);
}
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

try {
  stage = 'admin ver';
  // ── 1. Administrador: VER ────────────────────────────────────────────────
  await loginAs(ids.adminToken, ids.admin);
  await page.goto(`${BASE}/admin/form/${ids.corpLatestId}?mode=view`, { waitUntil: 'networkidle' });
  await page.getByText(/Se quedó en 2 de 5|Stopped at 2 of 5/).waitFor({ timeout: 20000 });
  ok('Vista: panel de avance "Se quedó en 2 de 5"');
  expect(await page.getByText(/SOLO LECTURA|READ ONLY/).count() > 0, 'Vista: marcada como SOLO LECTURA');
  const stepTitle = await page.locator('.standard-step-title').innerText();
  expect(/II\./.test(stepTitle), `Vista: abre en el paso donde se quedó el usuario (${stepTitle.trim()})`);
  const ana = page.locator('input[value="Ana Pérez"]').first();
  expect(await ana.isDisabled(), 'Vista: los campos están bloqueados (solo lectura)');
  expect(await page.locator('.corp-btn-save').count() === 0, 'Vista: sin botón Guardar avance');
  await shot('01-admin-ver');
  await page.locator('.corp-btn-nav-next').click();
  expect(/III\./.test(await page.locator('.standard-step-title').innerText()), 'Vista: se puede navegar entre pasos');

  stage = 'admin editar';
  // ── 2. Administrador: EDITAR ─────────────────────────────────────────────
  await page.getByRole('button', { name: /^Editar$|^Edit$/ }).click();
  await page.getByText(/EDICIÓN DEL ADMINISTRADOR|ADMINISTRATOR EDIT/).waitFor({ timeout: 20000 });
  ok('Edición: cambia a modo EDICIÓN DEL ADMINISTRADOR');
  const passport = page.locator('input[value="A111"]').first();
  expect(await passport.isEnabled(), 'Edición: los campos son editables');
  await passport.fill('A777');
  await page.locator('.corp-btn-save').click();
  await page.getByText(/Trámite actualizado|Form updated/).first().waitFor({ timeout: 20000 });
  ok('Edición: guardado con mensaje de confirmación');
  await page.getByText('v6', { exact: false }).first().waitFor({ timeout: 10000 });
  ok('Edición: el panel muestra la nueva versión v6');
  const newId = new URL(page.url()).pathname.split('/').pop();
  expect(newId && newId !== ids.corpLatestId, 'Edición: la URL apunta a la nueva versión');
  await shot('02-admin-editar');

  stage = 'usuario rastro';
  // ── 3. Usuario: ve el rastro de la edición ──────────────────────────────
  await loginAs(ids.clientToken, ids.client);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.getByText(/Editado por el administrador|Edited by administrator/).first().waitFor({ timeout: 20000 });
  ok('Usuario: la lista de trámites muestra "Editado por el administrador"');
  await shot('03-usuario-lista');
  await page.goto(`${BASE}/dashboard?view=form&id=${newId}`, { waitUntil: 'networkidle' });
  await page.getByText(/fue editado por el administrador|was edited by the administrator/).first().waitFor({ timeout: 20000 });
  ok('Usuario: al abrir el trámite ve el aviso de edición del administrador');
  // El usuario abre en el paso 1 (como siempre); el pasaporte está en el paso 2.
  await page.locator('.corp-btn-nav-next').click();
  await page.locator('input[value="A777"]').first().waitFor({ timeout: 10000 }).catch(() => {});
  expect(await page.locator('input[value="A777"]').count() > 0, 'Usuario: ve el dato corregido por el administrador (A777) en Junta Directiva');
  await shot('04-usuario-aviso');

  stage = 'kyc individual';
  // ── 3b. KYC Individual según la plantilla oficial ─────────────────────────
  if (ids.kycId) {
    const dialogs = [];
    const onDialog = (d) => { dialogs.push(d.message()); d.accept().catch(() => {}); };
    page.on('dialog', onDialog);
    await page.goto(`${BASE}/dashboard?view=form&id=${ids.kycId}`, { waitUntil: 'networkidle' });
    await page.getByText(/entidad paname|Panama entity/i).first().waitFor({ timeout: 20000 });
    ok('KYCI: el formulario pide la entidad panameña y la calidad del solicitante (plantilla)');
    expect(await page.locator('input[value="Ana"]').count() > 0 && await page.locator('input[value="Pérez"]').count() > 0,
      'KYCI: trámite antiguo carga el nombre partido en nombre / apellidos');
    expect(await page.locator('.kyci-guide').count() >= 8 && await page.getByText(/Tal como aparece en su pasaporte|As shown in your passport/).count() > 0,
      'KYCI: cada campo muestra su texto guía de la plantilla');
    expect(await page.getByText(/Cédula|ID Card|Ocupaci|Occupation|Empleador|Employer/).count() === 0,
      'KYCI: ya no muestra campos que la plantilla no tiene');
    await page.locator('.expert-btn-primary').first().click();
    await page.waitForTimeout(500);
    expect(dialogs.length > 0, 'KYCI: no deja avanzar sin los datos obligatorios de la plantilla');
    expect(await page.getByText(/I\. Solicitante|I\. Applicant/).count() > 0, 'KYCI: se queda en el paso I');
    await shot('05-kyci-plantilla');
    page.off('dialog', onDialog);
  }
  if (ids.kycNewId) {
    await loginAs(ids.adminToken, ids.admin);
    await page.goto(`${BASE}/admin/form/${ids.kycNewId}?mode=view`, { waitUntil: 'networkidle' });
    // Abre en el paso donde quedó el usuario (IV): documentos marcados; luego vuelve al paso I.
    await page.getByText(/Pasaporte con fotografía a color|Colour Picture Passport/).first().waitFor({ timeout: 20000 });
    expect(await page.getByText(/^NOTAS$|^NOTES$/).count() === 0, 'KYCI: el paso IV ya no muestra las notas del final');
    expect(await page.locator('input[type="checkbox"]:checked').count() >= 4, 'KYCI: el administrador ve los documentos marcados (paso IV)');
    for (let i = 0; i < 3; i += 1) await page.locator('.expert-btn-nav').first().click();
    await page.locator('input[value="Atlántico S.A."]').first().waitFor({ timeout: 10000 }).catch(() => {});
    expect(await page.locator('input[value="Atlántico S.A."]').count() > 0, 'KYCI: el administrador ve el trámite con el formato de la plantilla');
    await shot('06-kyci-admin');
    await loginAs(ids.clientToken, ids.client);
  }

  stage = 'kyc entities';
  // ── 3c. KYC Entities según la plantilla oficial ───────────────────────────
  if (ids.kyceOldId) {
    const dialogs = [];
    const onDialog = (d) => { dialogs.push(d.message()); d.accept().catch(() => {}); };
    page.on('dialog', onDialog);
    await page.goto(`${BASE}/dashboard?view=form&id=${ids.kyceOldId}`, { waitUntil: 'networkidle' });
    await page.getByText(/entidad paname|Panama entity/i).first().waitFor({ timeout: 20000 });
    ok('KYCE: el formulario sigue la plantilla (entidad panameña, delitos y sanciones)');
    expect(await page.locator('input[value="Vieja S.A."]').count() > 0, 'KYCE: trámite antiguo carga sus datos');
    expect(await page.locator('.kyc-guide').count() >= 5, 'KYCE: los campos muestran su texto guía');
    expect(await page.getByText(/Sitio web|Website|Representante legal|Legal representative|Origen de fondos|Source of funds/).count() === 0,
      'KYCE: ya no muestra campos que la plantilla no tiene');
    await page.locator('.expert-btn-primary').first().click();
    await page.waitForTimeout(500);
    expect(dialogs.length > 0, 'KYCE: no deja avanzar sin los datos obligatorios de la plantilla');
    await shot('07-kyce-plantilla');
    page.off('dialog', onDialog);
  }

  stage = 'mis tramites';
  // ── 3d. Mis trámites: cada uno se reconoce (nombre, estado, referencia) y se busca ─
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.locator('.nx-form-title').first().waitFor({ timeout: 20000 });
  expect(await page.locator('.nx-form-title').count() > 1, 'Mis trámites: cada trámite muestra su nombre');
  expect(await page.locator('.nx-ref').count() > 1 && await page.locator('[class*="nx-status-"]').count() > 1, 'Mis trámites: referencia y estado en cada fila');
  const totalRows = await page.locator('.nx-form-title, .nx-label-edit').count();
  await page.locator('.nx-forms-toolbar input').first().fill('atlantico');
  await page.waitForTimeout(400);
  const filtered = await page.locator('.nx-form-title').count();
  expect(filtered > 0 && filtered < totalRows, `Mis trámites: el buscador filtra por nombre (${filtered} de ${totalRows})`);
  await page.locator('.nx-forms-toolbar input').first().fill('');
  await shot('09-mis-tramites');

  stage = 'firmas usuario';
  // ── 4. Firmas: lista del usuario y bandeja del administrador ─────────────
  await page.goto(`${BASE}/dashboard?view=signed-docs`, { waitUntil: 'networkidle' });
  await page.getByText('Firma Digital Válida').first().waitFor({ timeout: 20000 });
  expect(await page.getByText(/Firma Inválida o Documento Alterado/).count() > 0, 'Usuario: ve los estados nuevos de firma (válida / alterada)');
  expect(await page.getByText(/Motivo: El documento no tiene firma/).count() > 0, 'Usuario: ve el motivo del rechazo del administrador');
  await shot('05-usuario-firmas');
  await loginAs(ids.adminToken, ids.admin);
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  stage = 'firmas administrador';
  await page.getByRole('button', { name: /Firmas|Signatures/ }).first().click();
  await page.getByText(/Revisión de firmas|Signature review/).first().waitFor({ timeout: 20000 });
  // La lista se carga después del encabezado: esperar a los botones antes de contarlos.
  await page.getByRole('button', { name: /Ver PDF|View PDF/ }).first().waitFor({ timeout: 20000 }).catch(() => {});
  expect(await page.getByRole('button', { name: /Ver PDF|View PDF/ }).count() > 0, 'Administrador: pestaña Firmas con documentos pendientes y botón Ver PDF');
  await shot('06-admin-firmas');

  stage = 'consultas excel';
  // ── 5. Consultas: botón Excel junto al reporte PDF ────────────────────────
  await page.getByRole('button', { name: /^\s*CONSULTAS\s*$|^\s*QUERIES\s*$|Consultas/i }).first().click();
  const nameInput = page.locator('form input[type="text"]').first();
  await nameInput.waitFor({ timeout: 20000 });
  await nameInput.fill('Ana');
  await page.locator('form button[type="submit"]').first().click();
  await page.locator('.admin-export-xlsx').first().waitFor({ timeout: 30000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.locator('.admin-export-xlsx').first().click(),
  ]);
  expect(/\.xlsx$/.test(download.suggestedFilename()), `Consultas: descarga el Excel (${download.suggestedFilename()})`);
  await shot('08-admin-consultas-excel');

  expect(problems.length === 0, `Sin errores de JavaScript ni violaciones CSP ${problems.length ? problems.join(' | ') : ''}`);
} catch (e) {
  await shot('zz-error').catch(() => {});
  fail(`[etapa: ${stage}] ${e.message.split('\n')[0]}${problems.length ? ` | ${problems.join(' | ')}` : ''}`);
}
await browser.close();
console.log(process.exitCode ? '\nE2E UI: FALLÓ' : `\nE2E UI: ${n} verificaciones OK`);
