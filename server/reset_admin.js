require('dotenv').config();
const { User } = require('./models');

async function resetPassword() {
    try {
        const user = await User.findOne({ where: { email: 'rokutvedw@gmail.com' } });
        if (!user) {
            console.log('❌ Usuario no encontrado.');
            process.exit(1);
        }
        user.password = 'Nexus123*'; // CLAVE TEMPORAL SEGURA
        user.status = 'authorized';
        user.loginAttempts = 0;
        await user.save();
        console.log('✅ CONTRASEÑA RESETEADA CON ÉXITO.');
        console.log('Email: rokutvedw@gmail.com');
        console.log('Nueva Clave: Nexus123*');
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}

resetPassword();
