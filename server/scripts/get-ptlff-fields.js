const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function getPTLFF() {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/sistema_formularios`, { logging: false });
    try {
        const [rows] = await sequelize.query("SELECT prefijo, nombre_archivo, campos_configurados FROM formularios WHERE prefijo = 'PTLFF'");
        console.log(`--- SE ENCONTRARON (${rows.length}) FORMULARIOS PTLFF ---`);
        for (const r of rows) {
            console.log(`\nPREFIJO: ${r.prefijo}`);
            console.log(`NOMBRE ARCHIVO: ${r.nombre_archivo}`);
            console.log(`CAMPOS:`, JSON.stringify(r.campos_configurados, null, 2));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
getPTLFF();
