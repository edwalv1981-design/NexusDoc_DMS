require('../utils/loadEnv').loadEnv();
const { connectDB } = require('../config/db');
const { User } = require('../models');

async function createAdmin() {
    try {
        await connectDB();
        const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
        const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
        if (!email || !password) {
            console.error('❌ Defina BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD. No se admiten claves en el script.');
            process.exit(1);
        }

        let admin = await User.findOne({ where: { email } });
        if (!admin) {
            await User.create({
                name: process.env.BOOTSTRAP_ADMIN_NAME || 'Administrador',
                email,
                password,
                role: 'admin',
                status: 'authorized',
                idNumber: 'ADMIN-BOOTSTRAP-' + Date.now(),
                uniqueCode: 'MASTER-' + Date.now()
            });
            console.log('✅ Usuario master creado: ' + email);
        } else {
            console.log('ℹ️ El usuario ya existe. Este script no modifica claves existentes.');
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creando el usuario:', err);
        process.exit(1);
    }
}
createAdmin();
