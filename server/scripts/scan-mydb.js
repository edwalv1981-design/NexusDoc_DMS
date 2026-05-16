const { Sequelize } = require('sequelize');
require('dotenv').config();

async function scan() {
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/mydb', { logging: false });
    const qi = s.getQueryInterface();
    try {
        const tables = await qi.showAllTables();
        console.log('TABLES IN mydb:', tables);
        for (const t of tables) {
            const [rows] = await s.query(`SELECT count(*) FROM "${t}"`);
            console.log(`${t}: ${rows[0].count} rows`);
        }
    } catch (e) { console.error('FAIL mydb:', e.message); }
    process.exit(0);
}
scan();
