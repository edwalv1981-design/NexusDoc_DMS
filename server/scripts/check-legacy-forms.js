const { Sequelize } = require('sequelize');
require('dotenv').config();

async function checkLegacyForms() {
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/sistema_formularios', { logging: false });
    try {
        const [rows] = await s.query("SELECT * FROM formularios");
        rows.forEach(r => {
            console.log(`FORM: ${r.nombre} | ID: ${r.id}`);
            console.log(`DESCRIPCION: ${r.descripcion}`);
            // Check if there's a blob or text column with the "template"
            console.log('---');
        });
    } catch (e) { console.log('Error:', e.message); }
    process.exit(0);
}
checkLegacyForms();
