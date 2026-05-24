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
    (isProduction && !lower.includes('localhost') && !lower.includes('127.0.0.1'))
  );
}

const buildDialectOptions = () => {
  if (process.env.DATABASE_URL && databaseNeedsSsl(process.env.DATABASE_URL)) {
    return {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    };
  }
  return {};
};

const common = {
  dialect: 'postgres',
  logging: false,
  dialectOptions: buildDialectOptions()
};

const buildLocalConfig = () => ({
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'nexusdoc',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  ...common
});

const buildProductionConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      use_env_variable: 'DATABASE_URL',
      ...common
    };
  }
  throw new Error(
    'DATABASE_URL requerida en producción para sequelize-cli (fly secrets set DATABASE_URL=...)'
  );
};

module.exports = {
  development: buildLocalConfig(),
  test: buildLocalConfig(),
  production: buildProductionConfig()
};
