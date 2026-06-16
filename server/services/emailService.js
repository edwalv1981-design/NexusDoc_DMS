const nodemailer = require('nodemailer');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = 'soporte@nexusdoc.it.com'; // Hardcoded for guaranteed delivery

const useNodemailer = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
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
        console.error('❌ Ni RESEND_API_KEY ni SMTP configurado. No se puede enviar correo.');
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
            // Fallback a Resend si existe
            if (!RESEND_API_KEY) return false;
        }
    }
    
    if (RESEND_API_KEY) {
        return new Promise((resolve) => {
            const https = require('https');
            const data = JSON.stringify({
                from: `NexusDoc <${SENDER_EMAIL}>`,
                to: toEmail,
                subject: subject,
                text: textFallback,
                html: html
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
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ Error crítico de conexión con Resend:', error.message);
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
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #0078d4;">Seguridad NexusDoc</h2>
            <p>Tu código de verificación es:</p>
            <div style="font-size: 32px; font-weight: bold; background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; color: #111; letter-spacing: 5px;">
                ${code}
            </div>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">Este correo ha sido enviado de forma segura.</p>
        </div>
    `;
    const text = `Seguridad NexusDoc\nTu código de verificación es: ${code}\nEste correo ha sido enviado de forma segura.`;
    
    return await sendHtmlEmail(toEmail, 'Tu Código de Seguridad - NexusDoc DMS', html, text);
};

const sendTemporaryPassword = async (toEmail, tempPassword) => {
    if (!hasEmailConfig()) return false;

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #0078d4;">Acceso NexusDoc</h2>
            <p>Se ha generado una clave temporal para tu cuenta:</p>
            <div style="font-size: 24px; font-weight: bold; background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; color: #111;">
                ${tempPassword}
            </div>
            <p style="margin-top: 20px; color: #dc2626; font-weight: bold;">Por seguridad, cambia esta clave al ingresar.</p>
        </div>
    `;
    const text = `Acceso NexusDoc\nSe ha generado una clave temporal para tu cuenta:\n${tempPassword}\nPor seguridad, cambia esta clave al ingresar.`;
    
    return await sendHtmlEmail(toEmail, 'Tu Nueva Clave de Acceso - NexusDoc', html, text);
};

const sendAccountLockedNotice = async (toEmail) => {
    if (!hasEmailConfig()) return false;

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #dc2626;">Cuenta Bloqueada</h2>
            <p>Te informamos que el período de prueba/acceso de 14 días para tu usuario ha expirado.</p>
            <p><strong>Tu usuario ha sido bloqueado, por favor comunícate con tu administrador.</strong></p>
        </div>
    `;
    const text = `Cuenta Bloqueada\nTe informamos que el período de prueba/acceso de 14 días para tu usuario ha expirado.\nTu usuario ha sido bloqueado, por favor comunícate con tu administrador.`;
    
    return await sendHtmlEmail(toEmail, 'Tu cuenta ha sido bloqueada por caducidad - NexusDoc', html, text);
};

module.exports = {
    sendSecurityCode,
    sendTemporaryPassword,
    sendAccountLockedNotice
};
