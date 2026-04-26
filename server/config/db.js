const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;
let dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
    console.log('📡 Conectando a Producción con SSL...');
    
    if (dbUrl.startsWith('postgresql://')) {
        dbUrl = dbUrl.replace('postgresql://', 'postgres://');
    }

    sequelize = new Sequelize(dbUrl, {
        dialect: 'postgres',
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
    console.log('🏠 Usando configuración local...');
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
        console.error('❌ FATAL: Error de conexión:', err.message);
        // No salimos del proceso inmediatamente para dejar que Railway nos dé más info
    }
};

module.exports = { sequelize, connectDB };
