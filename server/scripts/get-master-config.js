const { Sequelize } = require('sequelize');
require('dotenv').config();

async function getMasterConfig() {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/sistema_formularios`, { logging: false });
    const [rows] = await sequelize.query("SELECT campos_configurados FROM formularios WHERE prefijo = 'PTLFF'");
    if (rows.length > 0) {
        console.log(JSON.stringify(rows[0].campos_configurados, null, 2));
    } else {
        console.log('No se encontró configuración para PTLFF');
    }
    process.exit(0);
}
getMasterConfig();
