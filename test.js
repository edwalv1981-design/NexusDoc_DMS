const { sequelize } = require('./server/config/db');

async function test() {
    try {
        const sql = `SELECT f.id FROM "FormData" f WHERE f.data::text ILIKE :pattern LIMIT 1`;
        const [rows] = await sequelize.query(sql, { replacements: { pattern: '%Edwin%' } });
        console.log("Success:", rows);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}
test();
