const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

// LOGICA DE CONEXIÓN ROBUSTA PARA PRODUCCIÓN
const dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
    console.log('📡 Intentando conexión vía DATABASE_URL...');
    sequelize = new Sequelize(dbUrl, {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        define: {
            timestamps: true,
            underscored: true,
        }
    });
} else {
    console.log('🏠 Intentando conexión local...');
    sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        port: process.env.DB_PORT,
        logging: false,
        define: {
            timestamps: true,
            underscored: true,
        }
    });
}

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL Connected Successfully!');
    } catch (err) {
        console.error('❌ FATAL: Error de conexión a la base de datos:');
        console.error('Mensaje:', err.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };
