const { Sequelize } = require('sequelize');
require('dotenv').config();

async function getFullRow() {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/sistema_formularios`, { logging: false });
    const [rows] = await sequelize.query("SELECT * FROM formularios WHERE prefijo = 'PTLFF'");
    console.log(JSON.stringify(rows[0], (key, value) => {
        if (typeof value === 'string' && value.length > 500) return value.substring(0, 500) + '... [TRUNCATED]';
        return value;
    }, 2));
    process.exit(0);
}
getFullRow();
