const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
let dbUrl = process.env.DATABASE_URL;

function createSequelizeFromUrl(url) {
    let normalized = url;
    if (normalized.startsWith('postgresql://')) {
        normalized = normalized.replace('postgresql://', 'postgres://');
    }

    return new Sequelize(normalized, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        },
        define: {
            timestamps: true,
            underscored: true,
        },
    });
}

function createLocalSequelize() {
    return new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
        logging: false,
        define: {
            timestamps: true,
            underscored: true,
        },
    });
}

let sequelize;

if (dbUrl) {
    console.log('📡 Conectando a Producción con SSL...');
    sequelize = createSequelizeFromUrl(dbUrl);
} else if (isProduction) {
    console.error(
        '❌ DATABASE_URL no está definida en producción. Configure fly secrets (Supabase). /health sigue activo; la API no podrá usar la BD.'
    );
    sequelize = null;
} else {
    console.log('🏠 Usando configuración local...');
    sequelize = createLocalSequelize();
}

const connectDB = async () => {
    if (!sequelize) {
        throw new Error('DATABASE_URL requerida en producción (fly secrets set DATABASE_URL=...)');
    }
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL Connected Successfully!');
    } catch (err) {
        console.error('❌ FATAL: Error de conexión:', err.message);
        throw err;
    }
};

module.exports = { sequelize, connectDB };
