const { sequelize } = require('./server/config/db');
const { QueryTypes } = require('sequelize');

async function auditDB() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión establecida.');
        
        const tables = await sequelize.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
            { type: QueryTypes.SELECT }
        );
        console.log('--- TABLAS ENCONTRADAS ---');
        console.table(tables);

        const columns = await sequelize.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'",
            { type: QueryTypes.SELECT }
        );
        console.log('--- COLUMNAS EN TABLA USERS ---');
        console.table(columns);

        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR DE AUDITORÍA:', err.message);
        process.exit(1);
    }
}

auditDB();
