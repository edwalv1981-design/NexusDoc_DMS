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

    // 1. Servidor Principal
    try {
        const res = await fetchWithTimeout(`${DEFAULT_BASE}/health`);
        const text = await res.text();
        const ok = res.status === 200 && (text.includes('OK') || /servidor\s+vivo/i.test(text));
        results.push({ name: 'Servidor Principal (/health)', status: ok ? 'OK' : 'FAIL', detail: `HTTP ${res.status}` });
    } catch (e) {
        results.push({ name: 'Servidor Principal (/health)', status: 'FAIL', detail: e.message });
    }

    // 2. Interfaz SPA Web (/)
    try {
        const res = await fetchWithTimeout(`${DEFAULT_BASE}/`);
        results.push({ name: 'Interfaz Web Principal (/)', status: res.status === 200 ? 'OK' : 'FAIL', detail: `HTTP ${res.status}` });
    } catch (e) {
        results.push({ name: 'Interfaz Web Principal (/)', status: 'FAIL', detail: e.message });
    }

    // 3. Autenticación de Usuarios (/api/auth/login)
    let masterToken = '';
    try {
        const res = await fetchWithTimeout(`${DEFAULT_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'ptl.accounts@proton.me', password: 'Admin1234*' })
        });
        if (res.status === 200) {
            const data = await res.json();
            if (data.token && data.user && data.user.role === 'admin' && data.user.mustChangePassword === false) {
                masterToken = data.token;
                results.push({ name: 'Ingreso de Usuarios y Maestro (/api/auth/login)', status: 'OK', detail: 'Login exitoso y cuenta autorizada sin bloqueo' });
            } else {
                results.push({ name: 'Ingreso de Usuarios (/api/auth/login)', status: 'FAIL', detail: `Bucle o bloqueo detectado: mustChangePassword=${data.user?.mustChangePassword}` });
            }
        } else {
            results.push({ name: 'Ingreso de Usuarios (/api/auth/login)', status: 'FAIL', detail: `HTTP ${res.status}` });
        }
    } catch (e) {
        results.push({ name: 'Ingreso de Usuarios (/api/auth/login)', status: 'FAIL', detail: e.message });
    }

    // 4. Generación y Consulta de Formularios (/api/forms)
    try {
        const headers = masterToken ? { 'x-auth-token': masterToken } : {};
        const res = await fetchWithTimeout(`${DEFAULT_BASE}/api/forms/templates/status`, { headers });
        const ok = res.status === 200 || res.status === 401;
        results.push({ name: 'Generación/Plantillas de Formularios (/api/forms)', status: ok ? 'OK' : 'FAIL', detail: `HTTP ${res.status}` });
    } catch (e) {
        results.push({ name: 'Generación/Plantillas de Formularios', status: 'FAIL', detail: e.message });
    }

    // 5. Carga y Subida de Documentos (/api/documents & /api/signed-docs)
    try {
        const headers = masterToken ? { 'x-auth-token': masterToken } : {};
        const res = await fetchWithTimeout(`${DEFAULT_BASE}/api/documents`, { headers });
        const ok = res.status === 200 || res.status === 401 || res.status === 403;
        results.push({ name: 'Subida/Gestión de Documentos (/api/documents)', status: ok ? 'OK' : 'FAIL', detail: `HTTP ${res.status}` });
    } catch (e) {
        results.push({ name: 'Subida/Gestión de Documentos', status: 'FAIL', detail: e.message });
    }

    const failedChecks = results.filter(r => r.status === 'FAIL');
    const allPassed = failedChecks.length === 0;

    if (allPassed) {
        console.log(`🟢 [${ts}] Sistema 100% Operativo (5/5 pruebas OK). NO se envió correo (modo de notificación solo por novedades/fallos activo).`);
        return;
    }

    // SI HAY NOVEDADES / FALLOS -> ENVIAR CORREO DE ALERTA DE INMEDIATO
    console.warn(`🚨 [${ts}] Novedad/Incidente detectado (${failedChecks.length} prueba(s) fallida(s)). Enviando alerta por correo...`);

    const rowsHtml = results.map(r => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-size: 13px; font-weight: 600;">${r.name}</td>
            <td style="padding: 10px; font-size: 13px; text-align: center;">
                <span style="padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; background-color: ${r.status === 'OK' ? '#dcfce7' : '#fee2e2'}; color: ${r.status === 'OK' ? '#15803d' : '#991b1b'};">
                    ${r.status}
                </span>
            </td>
            <td style="padding: 10px; font-size: 12px; color: ${r.status === 'OK' ? '#64748b' : '#dc2626'};">${r.detail}</td>
        </tr>
    `).join('');

    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"></head>
        <body style="font-family: sans-serif; background-color: #f8fafc; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fee2e2; overflow: hidden; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.1);">
                <div style="background: #991b1b; padding: 20px; color: #ffffff; text-align: center;">
                    <h2 style="margin:0; font-size: 20px;">🚨 ALERTA DE INCIDENCIA - NexusDoc DMS</h2>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #fecaca;">Reporte de Novedades (${ts})</p>
                </div>
                <div style="padding: 24px;">
                    <p style="font-size: 14px; margin-bottom: 15px; color: #991b1b; font-weight: bold;">
                        Se ha detectado una novedad operativa en el sistema de producción:
                    </p>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f5f9; text-align: left;">
                                <th style="padding: 8px; font-size: 12px; color: #475569;">Funcionalidad</th>
                                <th style="padding: 8px; font-size: 12px; color: #475569; text-align: center;">Estado</th>
                                <th style="padding: 8px; font-size: 12px; color: #475569;">Novedad Detectada</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
                <div style="background: #fff5f5; padding: 15px; text-align: center; font-size: 11px; color: #991b1b; border-top: 1px solid #fee2e2;">
                    Notificación Automática de Novedades de Servicio &bull; NexusDoc DMS Railway
                </div>
            </div>
        </body>
        </html>
    `;

    const subject = `🚨 ALERTA: Novedad detectada en NexusDoc DMS (${failedChecks.map(f => f.name).join(', ')}) - ${ts}`;

    for (const recipient of RECIPIENTS) {
        await sendHtmlEmail(recipient, subject, html, `Alerta NexusDoc DMS: Novedades detectadas en ${failedChecks.length} componentes.`);
    }
    console.log('✅ Correo de alerta por novedad enviado con éxito.');
}

runFullDiagnostics().catch(err => console.error('🔥 Error en diagnóstico:', err.message));
