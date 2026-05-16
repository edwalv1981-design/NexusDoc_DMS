const { Sequelize } = require('sequelize');
require('dotenv').config();

async function extractOne() {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/sistema_formularios`, { logging: false });
    try {
        const [rows] = await sequelize.query("SELECT * FROM formularios WHERE prefijo = 'PTLFF'");
        if (rows.length === 0) {
            console.log('No se encontró PTLFF');
            process.exit(0);
        }
        const r = rows[0];
        console.log(`FOUND: ${r.nombre_archivo}`);
        
        if (r.archivo_base64) {
            console.log(`SIZE: ${r.archivo_base64.length} chars (base64)`);
            const pdf = require('pdf-parse');
            const buffer = Buffer.from(r.archivo_base64, 'base64');
            const data = await pdf(buffer);
            console.log('\n--- MASTER TEXT ---\n');
            console.log(data.text);
            console.log('\n-------------------\n');
        } else {
            console.log('archivo_base64 IS NULL');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
extractOne();
