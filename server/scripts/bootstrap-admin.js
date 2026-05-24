'use strict';

/**
 * Crea o actualiza un administrador contra DATABASE_URL (Supabase pooler).
 *
 * Requiere:
 *   DATABASE_URL
 *   BOOTSTRAP_ADMIN_EMAIL
 *   BOOTSTRAP_ADMIN_PASSWORD
 *
 * Uso: cd server && npm run bootstrap:admin
 */
require('../utils/loadEnv').loadEnv();

const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const { User } = require('../models');

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL no está definido.');
        process.exit(1);
    }

    const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
    const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Administrador Maestro';

    if (!email || !password) {
        console.error(
            '❌ Defina BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD (fly secrets o variables locales).'
        );
        process.exit(1);
    }

    if (password.length < 7) {
        console.error('❌ La contraseña debe tener al menos 7 caracteres.');
        process.exit(1);
    }

    await connectDB();

    let admin = await User.findOne({ where: { email } });

    if (!admin) {
        admin = await User.create({
            name,
            email,
            password,
            role: 'admin',
            status: 'authorized',
            idNumber: 'ADMIN-BOOTSTRAP',
            uniqueCode: 'MASTER-ADMIN-001',
        });
        console.log(`✅ Administrador creado: ${email}`);
    } else {
        admin.name = name;
        admin.password = password;
        admin.role = 'admin';
        admin.status = 'authorized';
        admin.loginAttempts = 0;
        admin.lockUntil = null;
        await admin.save();
        console.log(`✅ Administrador actualizado: ${email}`);
    }

    const verified = await bcrypt.compare(password, admin.password);
    if (!verified) {
        console.error('❌ Verificación bcrypt falló tras guardar el administrador.');
        process.exit(1);
    }

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ bootstrap-admin:', err.message);
    process.exit(1);
});
