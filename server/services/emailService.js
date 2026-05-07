const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'no-reply@nexusdoc.local';

const hasEmailConfig = () => {
    if (!RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY no configurada. No se puede enviar correo.');
        return false;
    }
    return true;
};

const sendSecurityCode = async (toEmail, code) => {
    if (!hasEmailConfig()) return false;

    console.log(`--------------------------------------------------`);
    console.log(`🔑 CÓDIGO DE EMERGENCIA: ${code}`);
    console.log(`📡 Enviando vía RESEND a: ${toEmail}...`);
    
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `NexusDoc <${SENDER_EMAIL}>`,
                to: toEmail,
                subject: 'Tu Código de Seguridad - NexusDoc DMS',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 12px; max-width: 500px;">
                        <h2 style="color: #0078d4;">Seguridad NexusDoc</h2>
                        <p>Tu código de verificación es:</p>
                        <div style="font-size: 32px; font-weight: bold; background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; color: #111; letter-spacing: 5px;">
                            ${code}
                        </div>
                        <p style="margin-top: 20px; color: #666; font-size: 12px;">Este correo ha sido enviado de forma segura a través de soporte.lol</p>
                    </div>
                `
            })
        });

        if (response.ok) {
            console.log('✅ Correo enviado exitosamente con Resend.');
            return true;
        } else {
            const errorData = await response.json();
            console.error('❌ Error en API de Resend:', errorData);
            return false;
        }
    } catch (error) {
        console.error('❌ Error crítico de conexión con Resend:', error.message);
        return false;
    }
};

const sendTemporaryPassword = async (toEmail, tempPassword) => {
    if (!hasEmailConfig()) return false;

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `NexusDoc <${SENDER_EMAIL}>`,
                to: toEmail,
                subject: 'Tu Nueva Clave de Acceso - NexusDoc',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 12px; max-width: 500px;">
                        <h2 style="color: #0078d4;">Acceso NexusDoc</h2>
                        <p>Se ha generado una clave temporal para tu cuenta:</p>
                        <div style="font-size: 24px; font-weight: bold; background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; color: #111;">
                            ${tempPassword}
                        </div>
                        <p style="margin-top: 20px; color: #dc2626; font-weight: bold;">Por seguridad, cambia esta clave al ingresar.</p>
                    </div>
                `
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Error en API de Resend:', errorData);
            return false;
        }

        console.log('✅ Clave temporal enviada con éxito.');
        return true;
    } catch (error) {
        console.error('❌ Error enviando clave temporal:', error.message);
        return false;
    }
};

module.exports = {
    sendSecurityCode,
    sendTemporaryPassword
};
