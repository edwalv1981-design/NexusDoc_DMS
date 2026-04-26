require('dotenv').config();
const { User } = require('./models');

async function fixAccess() {
    try {
        const count = await User.update(
            { 
                status: 'authorized',
                loginAttempts: 0,
                mustChangePassword: false // Por si acaso esto bloquea el flujo
            },
            { where: {} } // Afectar a TODOS para asegurar acceso
        );
        console.log(`✅ EXITO: ${count[0]} cuentas reseteadas y autorizadas.`);
        process.exit(0);
    } catch (e) {
        console.error('❌ ERROR:', e.message);
        process.exit(1);
    }
}

fixAccess();
