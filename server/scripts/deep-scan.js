const { Sequelize } = require('sequelize');
require('dotenv').config();

async function deepScan() {
    const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        port: process.env.DB_PORT,
        logging: false
    });
    try {
        await sequelize.authenticate();
        const [tables] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(`--- ESCANEANDO TABLAS EN ${process.env.DB_NAME} ---`);
        
        for (const t of tables) {
            const tableName = t.table_name;
            const [columns] = await sequelize.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`);
            console.log(`Tabla: ${tableName}`);
            
            // Si tiene columnas tipo bytea o text, ver si tiene datos
            const hasDataCol = columns.some(c => c.data_type === 'bytea' || c.data_type === 'text');
            if (hasDataCol) {
                const [count] = await sequelize.query(`SELECT count(*) FROM "${tableName}"`);
                console.log(`  -> Filas: ${count[0].count}`);
                
                if (parseInt(count[0].count) > 0) {
                    const [rows] = await sequelize.query(`SELECT * FROM "${tableName}" LIMIT 5`);
                    rows.forEach(r => {
                        console.log(`     Row: ${JSON.stringify(r).substring(0, 100)}...`);
                    });
                }
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
deepScan();
