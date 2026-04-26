require('dotenv').config();
const { sendTemporaryPassword } = require('./services/emailService');

async function testTempPassword() {
    console.log('🔄 Probando envío de clave temporal a edwalv1981@gmail.com...');
    try {
        await sendTemporaryPassword('edwalv1981@gmail.com', 'PRUEBA123@2026');
        console.log('✅ Prueba exitosa. El correo DEBE estar en tu bandeja.');
    } catch (err) {
        console.error('❌ ERROR EN LA PRUEBA:', err.message);
    }
}

testTempPassword();
