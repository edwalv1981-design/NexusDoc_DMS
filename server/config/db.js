const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT,
    logging: false,
    define: {
        timestamps: true,
        underscored: true,
    }
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL Connected...');
    } catch (err) {
        console.error('❌ Unable to connect to the database:', err.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };
