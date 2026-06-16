require('dotenv').config({ path: './.env' });

async function testResend() {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
    
    console.log('Using API KEY:', RESEND_API_KEY);
    
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `onboarding@resend.dev`,
                to: 'edwalv1981@gmail.com', 
                subject: '¡Prueba Exitosa desde NexusDoc!',
                text: 'Este es el correo de prueba para comprobar que tu API Key funciona.',
                html: '<strong>¡Felicidades! Resend ya está conectado con tu código.</strong>'
            })
        });

        if (response.ok) {
            console.log('✅ Correo enviado exitosamente con Resend.');
            const data = await response.json();
            console.log(data);
        } else {
            const errorData = await response.json();
            console.error('❌ Error en API de Resend:', errorData);
        }
    } catch (error) {
        console.error('❌ Error crítico de conexión con Resend:', error.message);
    }
}

testResend();
