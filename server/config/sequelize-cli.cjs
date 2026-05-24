const path = require('path');

// Siempre intentar server/.env antes de loadEnv (NODE_ENV=production no debe bloquear migraciones locales).
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
require('../utils/loadEnv').loadEnv();

function databaseNeedsSsl(url) {
  if (process.env.DB_SSL === 'false') return false;
  if (process.env.DB_SSL === 'true') return true;
  const lower = (url || '').toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';
  return (
    lower.includes('supabase') ||
    lower.includes('sslmode=require') ||
    lower.includes('amazonaws.com') ||
    lower.includes('pooler.supabase.com') ||
    lower.includes('pooler.supabase.co') ||
    (isProduction && !lower.includes('localhost') && !lower.includes('127.0.0.1'))
  );
}

/** Parse DATABASE_URL explicitly (Supabase user postgres.PROJECT_REF, password URL-encoded). */
function configFromDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  let normalized = url;
  if (normalized.startsWith('postgresql://')) {
    normalized = normalized.replace('postgresql://', 'postgres://');
  }

  const u = new URL(normalized);
  const config = {
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'postgres',
    host: u.hostname,
    port: parseInt(u.port || '5432', 10),
    dialect: 'postgres',
    logging: false,
  };

  if (databaseNeedsSsl(url)) {
    config.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    };
  }

  return config;
}

const buildLocalConfig = () => ({
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'nexusdoc',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  dialect: 'postgres',
  logging: false,
});

const buildEnvConfig = () => {
  const fromUrl = configFromDatabaseUrl();
  if (fromUrl) return fromUrl;
  return buildLocalConfig();
};

const buildProductionConfig = () => {
  const fromUrl = configFromDatabaseUrl();
  if (fromUrl) return fromUrl;
  throw new Error(
    'DATABASE_URL requerida en producción para sequelize-cli. Local: cree server/.env con DATABASE_URL=... y use npm run db:migrate:url. Fly: fly secrets set DATABASE_URL=...'
  );
};

module.exports = {
  development: buildEnvConfig(),
  test: buildEnvConfig(),
};

Object.defineProperty(module.exports, 'production', {
  enumerable: true,
  get() {
    return buildProductionConfig();
  },
});
