const { Sequelize } = require('sequelize');
require('dotenv').config();

async function migrate() {
    const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/nexusdoc`, { logging: false });
    await sequelize.query("ALTER TABLE form_data ADD COLUMN IF NOT EXISTS user_unique_code VARCHAR(255)");
    console.log('✅ Columna user_unique_code añadida');
    process.exit(0);
}
migrate();
