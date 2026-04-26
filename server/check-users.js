const { User } = require('./models');

async function listUsers() {
    console.log('--- LISTA DE USUARIOS ACTUALES ---');
    const users = await User.findAll();
    users.forEach(u => {
        console.log(`ID: ${u.id} | Email: ${u.email} | Status: ${u.status} | Creado: ${u.createdAt}`);
    });
    console.log('-----------------------------------');
}

listUsers();
