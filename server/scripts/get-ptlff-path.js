const { Sequelize } = require('sequelize');
require('dotenv').config();

async function getPath() {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/sistema_formularios`, { logging: false });
    const [rows] = await sequelize.query("SELECT ruta_archivo, nombre_archivo FROM formularios WHERE prefijo = 'PTLFF'");
    console.log(JSON.stringify(rows[0], null, 2));
    process.exit(0);
}
getPath();
