const { Sequelize } = require('sequelize');
require('dotenv').config();

async function scan() {
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/nexusdoc', { logging: false });
    const qi = s.getQueryInterface();
    const tables = await qi.showAllTables();
    console.log('TABLES:', tables);
    for (const t of tables) {
        const [rows] = await s.query(`SELECT count(*) FROM "${t}"`);
        console.log(`${t}: ${rows[0].count} rows`);
    }
    process.exit(0);
}
scan();
