const { Sequelize } = require('sequelize');
require('dotenv').config();

async function listTables() {
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/nexusdoc', { logging: false });
    try {
        const results = await s.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('RAW RESULTS:', JSON.stringify(results, null, 2));
    } catch (e) { console.error(e); }
    process.exit(0);
}
listTables();
