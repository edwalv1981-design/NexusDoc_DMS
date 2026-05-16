const { Sequelize } = require('sequelize');
require('dotenv').config();

async function checkDB(dbName) {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName}`);
    try {
        await sequelize.authenticate();
        console.log(`✅ Conectado a ${dbName}`);
        
        const [tables] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(`--- TABLAS EN ${dbName} ---`);
        console.log(JSON.stringify(tables.map(t => t.table_name || t.TABLE_NAME), null, 2));

        const templateTableObj = tables.find(t => {
            const name = t.table_name || t.TABLE_NAME;
            return name && name.toLowerCase().includes('template');
        });
        
        if (templateTableObj) {
            const templateTable = templateTableObj.table_name || templateTableObj.TABLE_NAME;
            console.log(`🔍 Leyendo tabla: ${templateTable}`);
            const [results] = await sequelize.query(`SELECT * FROM "${templateTable}"`);
            
            for (const r of results) {
                const name = r.name || r.NAME || r.template_name;
                const fileData = r.file_data || r.fileData || r.FILEDATA || r.content || r.data;
                
                console.log(`- ${name} (${fileData ? fileData.length : 0} bytes)`);
                
                if (name && (name.toLowerCase().includes('fundacion') || name.toLowerCase().includes('ptlf'))) {
                    console.log(`🎯 ¡ENCONTRADA! Extrayendo texto...`);
                    const pdf = require('pdf-parse');
                    const data = await pdf(fileData);
                    console.log('\n--- CONTENIDO MASTER ---\n');
                    console.log(data.text);
                    console.log('\n-----------------------\n');
                }
            }
        }
    } catch (err) {
        console.error(`❌ Error en ${dbName}:`, err.message);
    }
}

async function run() {
    await checkDB('mydb');
    await checkDB('postgres');
    process.exit(0);
}
run();
