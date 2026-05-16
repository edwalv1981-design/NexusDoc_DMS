const { sequelize } = require('../config/db');

async function list() {
    try {
        const [results] = await sequelize.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog')");
        results.forEach(r => console.log(`${r.table_schema}.${r.table_name}`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
list();
