const { Sequelize } = require('sequelize');
require('dotenv').config();

async function findData() {
    const dbs = ['nexusdoc', 'sistema_formularios', 'mydb', 'postgres'];
    const user = process.env.DB_USER;
    const pass = process.env.DB_PASS;
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;

    for (const db of dbs) {
        console.log(`--- Buscando en DB: ${db} ---`);
        const sequelize = new Sequelize(`postgres://${user}:${pass}@${host}:${port}/${db}`, { logging: false });
        try {
            await sequelize.authenticate();
            const [tables] = await sequelize.query(`
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            `);
            
            for (const t of tables) {
                const fullName = `"${t.table_schema}"."${t.table_name}"`;
                try {
                    const [count] = await sequelize.query(`SELECT count(*) FROM ${fullName}`);
                    const n = parseInt(count[0].count);
                    if (n > 0) {
                        console.log(`  [+] ${fullName} tiene ${n} filas`);
                        const [rows] = await sequelize.query(`SELECT * FROM ${fullName} LIMIT 1`);
                        console.log(`      Campos: ${Object.keys(rows[0]).join(', ')}`);
                        
                        // Si parece ser una tabla de plantillas, mostrar nombres
                        if (fullName.toLowerCase().includes('template')) {
                            const [names] = await sequelize.query(`SELECT name FROM ${fullName}`);
                            names.forEach(x => console.log(`      * Plantilla: ${x.name}`));
                        }
                    }
                } catch (e) {
                    // Ignorar errores de permisos o tablas especiales
                }
            }
            await sequelize.close();
        } catch (err) {
            console.log(`  [!] Error conectando a ${db}: ${err.message}`);
        }
    }
    process.exit(0);
}
findData();
