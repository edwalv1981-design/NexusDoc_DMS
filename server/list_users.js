require('dotenv').config();
const { User } = require('./models');

async function listUsers() {
    try {
        const users = await User.findAll({ attributes: ['email', 'role', 'status'] });
        console.log('--- USUARIOS REGISTRADOS ---');
        users.forEach(u => console.log(`Email: ${u.email} | Rol: ${u.role} | Estado: ${u.status}`));
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}

listUsers();
