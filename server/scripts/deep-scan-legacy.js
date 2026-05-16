const { Sequelize } = require('sequelize');
require('dotenv').config();

async function deepScan() {
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/sistema_formularios', { logging: false });
    try {
        const [rows] = await s.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog')");
        console.log('ALL TABLES:', rows);
        
        for (const r of rows) {
            const fullName = `"${r.table_schema}"."${r.table_name}"`;
            const [count] = await s.query(`SELECT count(*) FROM ${fullName}`);
            console.log(`${fullName}: ${count[0].count} rows`);
        }
    } catch (e) { console.log('ERROR:', e.message); }
    process.exit(0);
}
deepScan();
