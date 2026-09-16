'use strict';

require('../server/utils/loadEnv').loadEnv();
const { sendHtmlEmail } = require('../server/services/emailService');

const DEFAULT_BASE = 'https://nexusdocdms-production.up.railway.app';
const TIMEOUT_MS = 15000;
const RECIPIENTS = ['ptl.accounts@proton.me', 'edwinalvarezvivero@yahoo.com'];

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timer);
    }
}

async function runFullDiagnostics() {
    const results = [];
    const ts = new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });

    // 1. Health Check
    try {
        const res = await fetchWithTimeout(`${DEFAULT_BASE}/health`);
        const text = await res.text();
        const ok = res.status === 200 && (text.includes('OK') || /servidor\s+vivo/i.test(text));
        results.push({ name: 'Servidor HTTP (/health)', status: ok ? 'OK' : 'FAIL', detail: `Status: ${res.status}` });
    } catch (e) {
        results.push({ name: 'Servidor HTTP (/health)', status: 'FAIL', detail: e.message });
    }

    // 2. SPA Root
    try {
        const res = await fetchWithTimeout(`${DEFAULT_BASE}/`);
        results.push({ name: 'Interfaz Principal (/)', status: res.status === 200 ? 'OK' : 'FAIL', detail: `Status: ${res.status}` });
    } catch (e) {
        results.push({ name: 'Interfaz Principal (/)', status: 'FAIL', detail: e.message });
    }

    // 3. Dashboard Route
    try {
        const res = await fetchWithTimeout(`${DEFAULT_BASE}/dashboard`);
        results.push({ name: 'Ruta Dashboard (/dashboard)', status: res.status === 200 ? 'OK' : 'FAIL', detail: `Status: ${res.status}` });
    } catch (e) {
        results.push({ name: 'Ruta Dashboard (/dashboard)', status: 'FAIL', detail: e.message });
    }

    // 4. Forms API Status
    try {
        const res = await fetchWithTimeout(`${DEFAULT_BASE}/api/forms/templates/status`);
        results.push({ name: 'API de Plantillas (/api/forms/templates/status)', status: (res.status === 200 || res.status === 401) ? 'OK' : 'FAIL', detail: `Status: ${res.status}` });
    } catch (e) {
        results.push({ name: 'API de Plantillas', status: 'FAIL', detail: e.message });
    }

    // 5. Master Login Check
    let loginOk = false;
    let loginDetail = '';
    try {
        const res = await fetchWithTimeout(`${DEFAULT_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'ptl.accounts@proton.me', password: 'Admin1234*' })
        });
        if (res.status === 200) {
            const data = await res.json();
            if (data.token && data.user && data.user.role === 'admin' && data.user.mustChangePassword === false) {
                loginOk = true;
                loginDetail = 'Autenticación exitosa (Token JWT activo, rol admin, sin cambio forzado de clave)';
            } else {
                loginDetail = `Respuesta no esperada: mustChangePassword=${data.user?.mustChangePassword}, role=${data.user?.role}`;
            }
        } else {
            loginDetail = `HTTP ${res.status}`;
        }
    } catch (e) {
        loginDetail = e.message;
    }
    results.push({ name: 'Autenticación Maestro (ptl.accounts@proton.me)', status: loginOk ? 'OK' : 'FAIL', detail: loginDetail });

    const allPassed = results.every(r => r.status === 'OK');
    const statusHeader = allPassed 
        ? '<span style="color: #16a34a; font-weight: bold;">🟢 100% OPERATIVO</span>' 
        : '<span style="color: #dc2626; font-weight: bold;">🔴 ATENCIÓN REQUERIDA</span>';

    const rowsHtml = results.map(r => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-size: 13px; font-weight: 600;">${r.name}</td>
            <td style="padding: 10px; font-size: 13px; text-align: center;">
                <span style="padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; background-color: ${r.status === 'OK' ? '#dcfce7' : '#fee2e2'}; color: ${r.status === 'OK' ? '#15803d' : '#991b1b'};">
                    ${r.status}
                </span>
            </td>
            <td style="padding: 10px; font-size: 12px; color: #64748b;">${r.detail}</td>
        </tr>
    `).join('');

    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"></head>
        <body style="font-family: sans-serif; background-color: #f8fafc; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                <div style="background: #0f172a; padding: 20px; color: #ffffff; text-align: center;">
                    <h2 style="margin:0; font-size: 20px;">NexusDoc DMS — Reporte de Monitoreo</h2>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Ejecutado el ${ts} (cada 30 min)</p>
                </div>
                <div style="padding: 24px;">
                    <p style="font-size: 15px; margin-bottom: 15px;">Estado General: ${statusHeader}</p>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f5f9; text-align: left;">
                                <th style="padding: 8px; font-size: 12px; color: #475569;">Componente</th>
                                <th style="padding: 8px; font-size: 12px; color: #475569; text-align: center;">Estado</th>
                                <th style="padding: 8px; font-size: 12px; color: #475569;">Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
                <div style="background: #f8fafc; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    NexusDoc DMS Production Monitoring &bull; Railway App
                </div>
            </div>
        </body>
        </html>
    `;

    const subject = `${allPassed ? '🟢' : '🔴'} [Monitoreo 30m] NexusDoc DMS: ${allPassed ? 'Sistema Operativo' : 'Alerta de Servicio'} (${ts})`;

    console.log(`📡 Enviando reporte de monitoreo a: ${RECIPIENTS.join(', ')}...`);
    for (const recipient of RECIPIENTS) {
        await sendHtmlEmail(recipient, subject, html, `Reporte de Monitoreo NexusDoc DMS: ${allPassed ? 'OPERATIVO' : 'ALERT'}`);
    }
    console.log('✅ Notificaciones de correo enviadas.');
}

runFullDiagnostics().catch(err => console.error('🔥 Error en diagnóstico:', err.message));
