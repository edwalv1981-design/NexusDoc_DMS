const nodemailer = require('nodemailer');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'soporte@nexusdoc.it.com';

const isValidSmtpHost = process.env.SMTP_HOST && 
                        process.env.SMTP_HOST !== '127.0.0.1' && 
                        process.env.SMTP_HOST !== 'localhost';

const useNodemailer = isValidSmtpHost && process.env.SMTP_USER && process.env.SMTP_PASS;

let transporter;
if (useNodemailer) {
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : undefined
        }
    });
}

const hasEmailConfig = () => {
    if (!RESEND_API_KEY && !useNodemailer) {
        console.error('❌ Ni RESEND_API_KEY ni SMTP válido configurado. No se puede enviar correo.');
        return false;
    }
    return true;
};

const sendHtmlEmail = async (toEmail, subject, html, textFallback) => {
    if (useNodemailer) {
        try {
            const sender = process.env.SENDER_EMAIL || process.env.SMTP_USER;
            await transporter.sendMail({
                from: `"NexusDoc DMS" <${sender}>`,
                to: toEmail,
                subject: subject,
                text: textFallback,
                html: html
            });
            console.log('✅ Correo enviado exitosamente con Nodemailer.');
            return true;
        } catch (error) {
            console.error('❌ Error en Nodemailer:', error.message);
            global.lastSmtpError = error.message;
            if (!RESEND_API_KEY) return false;
        }
    }
    
    if (RESEND_API_KEY) {
        return new Promise((resolve) => {
            const https = require('https');
            const crypto = require('crypto');
            const data = JSON.stringify({
                from: `NexusDoc DMS <${SENDER_EMAIL}>`,
                to: toEmail,
                reply_to: SENDER_EMAIL,
                subject: subject,
                text: textFallback,
                html: html,
                headers: {
                    'X-Entity-Ref-ID': crypto.randomUUID(),
                    'List-Unsubscribe': `<mailto:${SENDER_EMAIL}?subject=unsubscribe>`
                }
            });

            const options = {
                hostname: 'api.resend.com',
                port: 443,
                path: '/emails',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const req = https.request(options, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => responseBody += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log('✅ Correo enviado exitosamente con Resend.');
                        resolve(true);
                    } else {
                        console.error('❌ Error en API de Resend HTTP', res.statusCode, responseBody);
                        global.lastSmtpError = `Resend Error ${res.statusCode}: ${responseBody}`;
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ Error crítico de conexión con Resend:', error.message);
                global.lastSmtpError = error.message;
                resolve(false);
            });

            req.write(data);
            req.end();
        });
    }
    return false;
};

const sendSecurityCode = async (toEmail, code) => {
    if (!hasEmailConfig()) return false;

    if (process.env.NODE_ENV !== 'production') {
        console.log(`🔑 CÓDIGO DE EMERGENCIA: ${code}`);
    }
    console.log(`📡 Enviando código de seguridad a: ${toEmail.substring(0, 3)}***`);
    
    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Código de Verificación - NexusDoc DMS</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f8fafc; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding: 40px 10px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                            <!-- Encabezado Corporativo -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #0f172a 0%, #0f766e 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">NexusDoc DMS</h1>
                                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">Sistema de Gestión Documental Empresarial</p>
                                </td>
                            </tr>
                            <!-- Contenido del Mensaje -->
                            <tr>
                                <td style="padding: 36px 32px; color: #1e293b;">
                                    <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Confirmación de Identidad</h2>
                                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                                        Has solicitado un código de verificación para tu cuenta en NexusDoc DMS. Utiliza la siguiente clave temporal para completar tu acceso:
                                    </p>
                                    <!-- Caja de Código -->
                                    <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; display: block;">
                                            ${code}
                                        </span>
                                    </div>
                                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                                        ⏱️ Este código es válido durante <strong>3 minutos</strong> por razones de seguridad.
                                    </p>
                                    <p style="margin: 0; font-size: 12.5px; color: #94a3b8; line-height: 1.5;">
                                        Si tú no solicitaste este código, puedes ignorar este correo de forma segura. Tu cuenta permanece protegida.
                                    </p>
                                </td>
                            </tr>
                            <!-- Pie de Página Transaccional -->
                            <tr>
                                <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center; font-size: 11.5px; color: #94a3b8; line-height: 1.5;">
                                    NexusDoc DMS &copy; 2026. Todos los derechos reservados.<br>
                                    Notificación de Seguridad Transaccional Automática.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
    const text = `NexusDoc DMS - Confirmación de Identidad\n\nTu código de verificación es: ${code}\n\nEste código es válido durante 3 minutos. Si no solicitaste este código, ignora este mensaje.`;
    
    return await sendHtmlEmail(toEmail, 'Tu Código de Seguridad - NexusDoc DMS', html, text);
};

const sendTemporaryPassword = async (toEmail, tempPassword) => {
    if (!hasEmailConfig()) return false;

    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Clave Temporal - NexusDoc DMS</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f8fafc; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding: 40px 10px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
                            <tr>
                                <td style="background: linear-gradient(135deg, #0f172a 0%, #0f766e 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">NexusDoc DMS</h1>
                                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">Recuperación de Acceso a la Cuenta</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 36px 32px; color: #1e293b;">
                                    <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Clave Temporal Generada</h2>
                                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                                        Se ha generado una clave temporal para ingresar a tu cuenta de NexusDoc DMS:
                                    </p>
                                    <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: 800; color: #0f172a; display: block;">
                                            ${tempPassword}
                                        </span>
                                    </div>
                                    <p style="margin: 0; font-size: 13px; color: #dc2626; font-weight: bold; line-height: 1.5;">
                                        ⚠️ Por razones de seguridad, te sugerimos actualizar tu contraseña inmediatamente después de iniciar sesión.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center; font-size: 11.5px; color: #94a3b8;">
                                    NexusDoc DMS &copy; 2026. Notificación de Seguridad Transaccional.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
    const text = `NexusDoc DMS - Recuperación de Acceso\n\nSe ha generado una clave temporal: ${tempPassword}\n\nPor seguridad, actualiza tu contraseña al ingresar.`;
    
    return await sendHtmlEmail(toEmail, 'Tu Nueva Clave de Acceso - NexusDoc DMS', html, text);
};

const sendAccountLockedNotice = async (toEmail) => {
    if (!hasEmailConfig()) return false;

    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Notificación de Cuenta - NexusDoc DMS</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f8fafc; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding: 40px 10px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
                            <tr>
                                <td style="background: linear-gradient(135deg, #0f172a 0%, #b91c1c 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">NexusDoc DMS</h1>
                                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #fecaca;">Aviso de Estado de la Cuenta</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 36px 32px; color: #1e293b;">
                                    <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #b91c1c;">Cuenta Bloqueada por Caducidad</h2>
                                    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                                        Te informamos que el período de acceso para tu usuario ha expirado.
                                    </p>
                                    <p style="margin: 0; font-size: 13.5px; color: #0f172a; font-weight: 700;">
                                        Por favor comunícate con tu administrador para restablecer el acceso.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center; font-size: 11.5px; color: #94a3b8;">
                                    NexusDoc DMS &copy; 2026. Sistema de Gestión Documental.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
    const text = `NexusDoc DMS - Cuenta Bloqueada\n\nEl período de acceso para tu usuario ha expirado.\nPor favor comunícate con tu administrador.`;
    
    return await sendHtmlEmail(toEmail, 'Aviso de Estado de Cuenta - NexusDoc DMS', html, text);
};

module.exports = {
    sendSecurityCode,
    sendTemporaryPassword,
    sendAccountLockedNotice
};
