const { Sequelize } = require('sequelize');
require('dotenv').config();

async function deepScan() {
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/nexusdoc', { logging: false });
    try {
        const [rows] = await s.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog')");
        console.log('ALL TABLES IN NEXUSDOC:', rows);
    } catch (e) { console.log('ERROR:', e.message); }
    process.exit(0);
}
deepScan();
