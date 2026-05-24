const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
let dbUrl = process.env.DATABASE_URL;

function databaseNeedsSsl(url) {
    if (process.env.DB_SSL === 'false') return false;
    if (process.env.DB_SSL === 'true') return true;
    const lower = (url || '').toLowerCase();
    return (
        lower.includes('supabase') ||
        lower.includes('sslmode=require') ||
        lower.includes('amazonaws.com') ||
        (isProduction && !lower.includes('localhost') && !lower.includes('127.0.0.1'))
    );
}

function createSequelizeFromUrl(url) {
    let normalized = url;
    if (normalized.startsWith('postgresql://')) {
        normalized = normalized.replace('postgresql://', 'postgres://');
    }

    const useSsl = databaseNeedsSsl(url);
    const config = {
        dialect: 'postgres',
        logging: false,
        define: {
            timestamps: true,
            underscored: true,
        },
    };

    if (useSsl) {
        config.dialectOptions = {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        };
    }

    return new Sequelize(normalized, config);
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
    console.log(`📡 Conectando a Producción${databaseNeedsSsl(dbUrl) ? ' con SSL' : ''}...`);
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
