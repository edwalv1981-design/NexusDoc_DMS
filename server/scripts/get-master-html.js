const { Sequelize } = require('sequelize');
require('dotenv').config();

async function getHtml() {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/sistema_formularios`, { logging: false });
    const [rows] = await sequelize.query("SELECT html_content FROM formularios WHERE prefijo = 'PTLFF'");
    if (rows.length > 0) {
        console.log(rows[0].html_content);
    } else {
        console.log('No se encontró HTML para PTLFF');
    }
    process.exit(0);
}
getHtml();
