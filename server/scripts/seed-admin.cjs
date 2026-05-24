'use strict';

/**
 * Crea o actualiza un administrador usando variables de entorno.
 *
 * BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD
 * (alias: ADMIN_EMAIL + ADMIN_PASSWORD)
 *
 * Uso: cd server && npm run seed:admin
 */
require('../utils/loadEnv').loadEnv();

const { connectDB } = require('../config/db');
const { User } = require('../models');

async function main() {
    const email = (
        process.env.BOOTSTRAP_ADMIN_EMAIL ||
        process.env.ADMIN_EMAIL ||
        ''
    )
        .trim()
        .toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';
    const name = process.env.BOOTSTRAP_ADMIN_NAME || process.env.ADMIN_NAME || 'Administrador Maestro';

    if (!email || !password) {
        console.error(
            '❌ Defina BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD (o ADMIN_EMAIL / ADMIN_PASSWORD).'
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
            idNumber: 'ADMIN-SEED',
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

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ seed-admin:', err.message);
    process.exit(1);
});
