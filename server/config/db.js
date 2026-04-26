const { Sequelize } = require('sequelize');
const url = require('url');
require('dotenv').config();

let sequelize;
const dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
    console.log('📡 Analizando DATABASE_URL para conexión segura...');
    
    // Parseo manual de la URL para evitar fallos del constructor de Sequelize
    const params = url.parse(dbUrl);
    const auth = params.auth.split(':');
    
    sequelize = new Sequelize(params.pathname.split('/')[1], auth[0], auth[1], {
        host: params.hostname,
        port: params.port,
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
    console.log('🏠 Usando configuración de base de datos local...');
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
        console.error('❌ FATAL: Error de conexión a la base de datos:', err.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };
