const { Sequelize } = require('sequelize');
require('dotenv').config();

async function checkCols() {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/nexusdoc`, { logging: false });
    const [rows] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'form_data'");
    console.log(rows.map(r => r.column_name));
    process.exit(0);
}
checkCols();
