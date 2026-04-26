const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendSecurityCode = async (toEmail, code) => {
    try {
        const mailOptions = {
            from: `"NexusDoc Security" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: 'Tu Código de Seguridad - NexusDoc DMS',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #6366f1;">NexusDoc DMS</h2>
                    <p>Has solicitado crear una cuenta. Tu código de seguridad es:</p>
                    <div style="font-size: 24px; font-weight: bold; background: #f3f4f6; padding: 10px; text-align: center; border-radius: 8px; color: #1f2937;">
                        ${code}
                    </div>
                    <p style="margin-top: 20px;">Si no has solicitado esto, puedes ignorar este mensaje.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return false;
    }
};

const sendTemporaryPassword = async (toEmail, tempPassword) => {
    const mailOptions = {
        from: process.env.SMTP_USER,
        to: toEmail,
        subject: 'NexusDoc - Tu cuenta ha sido autorizada',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #4f46e5; text-align: center;">¡Bienvenido a NexusDoc!</h2>
                <p>Tu solicitud de registro ha sido **aprobada** por el administrador.</p>
                <p>Para ingresar al sistema por primera vez, utiliza las siguientes credenciales:</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <p style="margin: 0; color: #64748b; font-size: 14px;">Correo electrónico:</p>
                    <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold;">${toEmail}</p>
                    <p style="margin: 0; color: #64748b; font-size: 14px;">Contraseña temporal:</p>
                    <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #4f46e5; letter-spacing: 2px;">${tempPassword}</p>
                </div>
                <p style="color: #dc2626; font-size: 13px; font-weight: bold; text-align: center;">Por seguridad, el sistema te solicitará cambiar esta contraseña al iniciar sesión.</p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="http://localhost:5173" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acceder a NexusDoc</a>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Clave temporal enviada a ${toEmail}`);
    } catch (error) {
        console.error('❌ Error enviando clave temporal:', error);
        throw error;
    }
};

module.exports = {
    sendSecurityCode,
    sendTemporaryPassword
};
