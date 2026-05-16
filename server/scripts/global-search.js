const { Sequelize } = require('sequelize');
require('dotenv').config();

async function globalSearch() {
    const dbs = ['postgres', 'mydb', 'sistema_formularios', 'nexusdoc'];
    for (const db of dbs) {
        console.log(`--- SEARCHING IN DB: ${db} ---`);
        const s = new Sequelize(`postgres://postgres:postgres123@localhost:5432/${db}`, { logging: false });
        try {
            const [tables] = await s.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            for (const t of tables) {
                const table = t.table_name;
                try {
                    const [[countResult]] = await s.query(`SELECT count(*) FROM "${table}"`);
                    const count = parseInt(countResult.count);
                    if (count > 0) {
                        const [foundRows] = await s.query(`SELECT * FROM "${table}" LIMIT 10`);
                        const str = JSON.stringify(foundRows);
                        if (str.includes('PTLF') || str.includes('Fundaci') || str.includes('Incorpora') || str.includes('pdf')) {
                            console.log(`✅ MATCH FOUND IN ${db}.${table} (${count} rows)`);
                            foundRows.forEach(r => {
                                 // Log names/types to identify templates
                                 console.log(`Row: ${r.nombre || r.name || r.id || '?'}`);
                            });
                        }
                    }
                } catch (e) { /* console.log(`Err table ${table}:`, e.message); */ }
            }
        } catch (e) { console.log(`Error in ${db}:`, e.message); }
        await s.close();
    }
    process.exit(0);
}
globalSearch();
