#!/usr/bin/env node
/**
 * Abre el sitio en Chromium real y verifica que:
 *  - la app React se dibuja (#root con contenido),
 *  - no hay violaciones de Content-Security-Policy,
 *  - no hay errores de JavaScript,
 *  - el script anti clic derecho (no-devtools.js) se ejecutó.
 * Uso: node browser-csp-check.mjs https://dominio1 https://dominio2
 */
import { chromium } from 'playwright';

const urls = process.argv.slice(2);
const enc = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
let failed = false;

const browser = await chromium.launch();
for (const url of urls) {
  const lines = [];
  const add = (status, check, detail = '') => { lines.push(`${status} | ${check} | ${detail}`); if (status === 'FAIL') failed = true; };
  const page = await browser.newPage();
  const cspViolations = [];
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));
  page.on('console', (m) => {
    const t = m.text();
    if (/Content Security Policy|Content-Security-Policy/i.test(t)) cspViolations.push(t.slice(0, 200));
  });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    add(res && res.ok() ? 'OK' : 'FAIL', 'Página carga en Chromium', `HTTP ${res ? res.status() : 'sin respuesta'}`);
    await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0, null, { timeout: 20000 })
      .then(() => add('OK', 'La app React se dibuja', '#root con contenido'))
      .catch(() => add('FAIL', 'La app React se dibuja', '#root vacío (pantalla en blanco)'));
    const pageCsp = await page.evaluate(() => window.__csp || []);
    const all = [...new Set([...pageCsp, ...cspViolations])];
    add(all.length ? 'FAIL' : 'OK', 'Sin violaciones de CSP', all.join(' ; ') || 'ninguna');
    add(jsErrors.length ? 'WARN' : 'OK', 'Sin errores de JavaScript', jsErrors.slice(0, 3).join(' ; ') || 'ninguno');
    const blocked = await page.evaluate(() => {
      const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      return !document.body.dispatchEvent(ev);
    });
    add(blocked ? 'OK' : 'WARN', 'Script no-devtools.js activo', blocked ? 'clic derecho bloqueado' : 'no se ejecutó');
    const title = await page.title();
    add('INFO', 'Título de la página', title);
  } catch (e) {
    add('FAIL', 'Página carga en Chromium', e.message.split('\n')[0]);
  }
  await page.close();
  console.log(`\n### ${url}\n${lines.join('\n')}`);
  console.log(`::notice title=Browser check ${url}::${enc(lines.join('\n'))}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
