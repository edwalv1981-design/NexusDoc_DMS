const { Sequelize } = require('sequelize');
const { prepareDatabaseUrlForPg } = require('./normalizeDatabaseUrl');
require('../utils/loadEnv').loadEnv();

const isProduction = process.env.NODE_ENV === 'production';
let dbUrl = process.env.DATABASE_URL;

function extractDbHost(url) {
    if (!url) return null;
    try {
        const normalized = url.startsWith('postgresql://')
            ? url.replace('postgresql://', 'postgres://')
            : url;
        return new URL(normalized).hostname;
    } catch {
        return null;
    }
}

function isIpv6LiteralHost(host) {
    if (!host) return false;
    const bare = host.replace(/^\[|\]$/g, '');
    return bare.includes(':') && !bare.includes('.');
}

function warnIfIpv6DirectConnection(url) {
    if (!isProduction || !url) return;
    const host = extractDbHost(url);
    if (!isIpv6LiteralHost(host)) return;
    const message =
        'DATABASE_URL usa un host IPv6 directo (p. ej. Supabase Direct). Fly.io suele fallar con ECONNREFUSED.\n' +
        '   Use el Session pooler de Supabase (IPv4), puerto 5432:\n' +
        '   postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require\n' +
        '   Dashboard → Connect → Session pooler (5432).';
    console.error(`❌ ${message}`);
    if (process.env.REJECT_IPV6_DB === 'true') {
        throw new Error(message.replace(/\n\s+/g, ' '));
    }
}

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
    const normalized = prepareDatabaseUrlForPg(url);

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
    warnIfIpv6DirectConnection(dbUrl);
    console.log(`📡 Conectando a Producción${databaseNeedsSsl(dbUrl) ? ' con SSL' : ''}...`);
    sequelize = createSequelizeFromUrl(dbUrl);
} else if (isProduction) {
    console.error(
        '❌ DATABASE_URL no está definida en producción. Configure fly secrets (Supabase Session pooler, puerto 5432). /health sigue activo; la API no podrá usar la BD.'
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
