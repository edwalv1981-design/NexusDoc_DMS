const { Sequelize } = require('sequelize');
require('dotenv').config();

async function listDBs() {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/postgres`);
    try {
        const [results] = await sequelize.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
        console.log('--- BASES DE DATOS DISPONIBLES ---');
        results.forEach(db => console.log(`- ${db.datname}`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
listDBs();
