const { Sequelize } = require('sequelize');
require('dotenv').config();

async function getFilled() {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/sistema_formularios`, { logging: false });
    const [rows] = await sequelize.query("SELECT * FROM formularios_llenos");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}
getFilled();
