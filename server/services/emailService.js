const nodemailer = require('nodemailer');
require('dotenv').config();

// Redundancia Experta: Aceptamos múltiples nombres de variables para evitar fallos de configuración
const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.USER_EMAIL;
const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.USER_PASS;
const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
const port = process.env.SMTP_PORT || process.env.EMAIL_PORT || 465;

const transporter = nodemailer.createTransport({
    host: host,
    port: parseInt(port),
    secure: parseInt(port) === 465, 
    auth: {
        user: user,
        pass: pass,
    },
});

const sendSecurityCode = async (toEmail, code) => {
    console.log(`📧 Intentando enviar código a: ${toEmail}...`);
    try {
        const mailOptions = {
            from: `"NexusDoc Security" <${user}>`,
            to: toEmail,
            subject: 'Tu Código de Seguridad - NexusDoc DMS',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #0078d4;">NexusDoc DMS</h2>
                    <p>Has solicitado una acción de seguridad. Tu código es:</p>
                    <div style="font-size: 32px; font-weight: bold; background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; color: #111; letter-spacing: 5px;">
                        ${code}
                    </div>
                    <p style="margin-top: 20px; color: #666;">Si no has solicitado esto, puedes ignorar este mensaje.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Correo enviado con éxito:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ ERROR CRÍTICO DE CORREO:', error.message);
        return false;
    }
};

const sendTemporaryPassword = async (toEmail, tempPassword) => {
    const mailOptions = {
        from: `"NexusDoc" <${user}>`,
        to: toEmail,
        subject: 'NexusDoc - Nueva Clave de Acceso',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #0078d4; text-align: center;">Acceso NexusDoc</h2>
                <p>Se ha generado una nueva clave temporal para tu cuenta:</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #111; letter-spacing: 2px;">${tempPassword}</p>
                </div>
                <p style="color: #dc2626; font-size: 13px; font-weight: bold; text-align: center;">Por seguridad, cambia esta clave en cuanto ingreses.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Clave temporal enviada a ${toEmail}`);
    } catch (error) {
        console.error('❌ Error enviando clave temporal:', error.message);
        throw error;
    }
};

module.exports = {
    sendSecurityCode,
    sendTemporaryPassword
};
