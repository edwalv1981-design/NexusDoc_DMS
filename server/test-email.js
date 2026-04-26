const { sendSecurityCode } = require('./services/emailService');

async function testEmail() {
    console.log('🔄 Iniciando prueba de envío de correo...');
    const result = await sendSecurityCode('edwalv1981@gmail.com', '123456');
    if (result) {
        console.log('✅ Prueba completada con éxito.');
    } else {
        console.log('❌ Prueba fallida. Revisa los errores anteriores.');
    }
}

testEmail();
