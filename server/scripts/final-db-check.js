const { sequelize } = require('../config/db');

async function checkAll() {
    try {
        const [tables] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(`Encontradas ${tables.length} tablas.`);
        
        for (const t of tables) {
            const name = t.table_name;
            if (!name) continue;
            
            const [count] = await sequelize.query(`SELECT count(*) FROM "${name}"`);
            const rowCount = parseInt(count[0].count);
            console.log(`Tabla: ${name} | Filas: ${rowCount}`);
            
            if (rowCount > 0) {
                const [rows] = await sequelize.query(`SELECT * FROM "${name}" LIMIT 1`);
                const rowStr = JSON.stringify(rows[0]);
                console.log(`  Dato: ${rowStr.substring(0, 300)}...`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('🔥 ERROR:', err);
        process.exit(1);
    }
}
checkAll();
