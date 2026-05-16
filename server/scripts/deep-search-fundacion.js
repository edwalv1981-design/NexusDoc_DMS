const { Sequelize } = require('sequelize');
require('dotenv').config();

async function findFundacion() {
    const s = new Sequelize('postgres://postgres:postgres123@localhost:5432/nexusdoc', { logging: false });
    try {
        const [rows] = await s.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        for (const r of rows) {
            const table = r.table_name;
            try {
                // Search for "fundacion" in any text column (expensive but we need it)
                const [cols] = await s.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`);
                for (const c of cols) {
                    if (c.data_type.includes('char') || c.data_type.includes('text') || c.data_type.includes('json')) {
                         const [found] = await s.query(`SELECT count(*) FROM "${table}" WHERE CAST("${c.column_name}" AS TEXT) ILIKE '%fundacion%'`);
                         if (found[0].count > 0) {
                             console.log(`🔍 FOUND "fundacion" in table ${table}, column ${c.column_name} (${found[0].count} matches)`);
                         }
                    }
                }
            } catch (inner) {}
        }
    } catch (e) { console.log('ERROR:', e.message); }
    process.exit(0);
}
findFundacion();
