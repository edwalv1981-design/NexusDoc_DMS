const { Sequelize } = require('sequelize');
require('dotenv').config();

async function scan() {
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/sistema_formularios', { logging: false });
    const qi = s.getQueryInterface();
    try {
        const tables = await qi.showAllTables();
        console.log('TABLES:', tables);
        for (const t of tables) {
            const [rows] = await s.query(`SELECT count(*) FROM "${t}"`);
            console.log(`${t}: ${rows[0].count} rows`);
            if (t.includes('formularios')) {
                const [data] = await s.query(`SELECT * FROM "${t}" LIMIT 2`);
                console.log(`SAMPLE DATA FROM ${t}:`, data);
            }
        }
    } catch (e) { console.error('FAIL:', e.message); }
    process.exit(0);
}
scan();
