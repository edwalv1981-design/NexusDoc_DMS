const { Sequelize } = require('sequelize');
require('dotenv').config();

async function analyzeDBs() {
    const nexusdoc = new Sequelize('postgres://postgres:postgres123@localhost:5432/nexusdoc', { logging: false });

    console.log('--- DB: nexusdoc ---');
    try {
        const [results] = await nexusdoc.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const tables = results.map(r => r.table_name);
        for (const tableName of tables) {
            const [countResult] = await nexusdoc.query(`SELECT count(*) FROM "${tableName}"`);
            const count = countResult[0].count;
            console.log(`Table: ${tableName.padEnd(25)} | Rows: ${count}`);
        }
    } catch (e) { console.error('Error nexusdoc:', e.message); }
    process.exit(0);
}
analyzeDBs();
