const { Sequelize } = require('sequelize');
require('dotenv').config();

async function getLegacy() {
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/sistema_formularios', { logging: false });
    try {
        const [rows] = await s.query("SELECT id, nombre, descripcion FROM formularios");
        console.log('DATA FROM formularios:', JSON.stringify(rows, null, 2));
    } catch (e) { console.log('ERROR:', e.message); }
    process.exit(0);
}
getLegacy();
