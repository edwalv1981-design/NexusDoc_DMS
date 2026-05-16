const { Sequelize } = require('sequelize');
require('dotenv').config();

async function list() {
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/sistema_formularios', { logging: false });
    const qi = s.getQueryInterface();
    try {
        const tables = await qi.showAllTables();
        for (const t of tables) {
            const [[{count}]] = await s.query(`SELECT count(*) FROM "${t}"`);
            console.log(`Table: ${t.padEnd(25)} | Rows: ${count}`);
        }
    } catch (e) { console.log('Error or no tables'); }
    process.exit(0);
}
list();
