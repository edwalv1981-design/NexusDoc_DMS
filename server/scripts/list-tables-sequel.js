const { sequelize } = require('../config/db');

async function list() {
    const qi = sequelize.getQueryInterface();
    const tables = await qi.showAllTables();
    for (const t of tables) {
        const [[{count}]] = await sequelize.query(`SELECT count(*) FROM "${t}"`);
        console.log(`Table: ${t.padEnd(25)} | Rows: ${count}`);
    }
    process.exit(0);
}
list();
