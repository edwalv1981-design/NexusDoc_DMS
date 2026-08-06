require('../utils/loadEnv').loadEnv();
const { connectDB } = require('../config/db');
const { User } = require('../models');

async function createAdmin() {
    try {
        await connectDB();
        const email = 'pymesedw@gmail.com';
        const password = 'Prueba2026*';
        
        let admin = await User.findOne({ where: { email } });
        if (!admin) {
            await User.create({
                name: 'Administrador Pymes',
                email,
                password,
                role: 'admin',
                status: 'authorized',
                idNumber: 'ADMIN-PYMES-' + Date.now(),
                uniqueCode: 'MASTER-PYMES-' + Date.now()
            });
            console.log('✅ Usuario master creado exitosamente: ' + email);
        } else {
            admin.password = password;
            admin.role = 'admin';
            admin.status = 'authorized';
            await admin.save();
            console.log('✅ El usuario ' + email + ' ya existía. Se actualizó su contraseña y permisos de administrador.');
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creando el usuario:', err);
        process.exit(1);
    }
}
createAdmin();
