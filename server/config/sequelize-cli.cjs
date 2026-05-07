require('dotenv').config();

const buildDialectOptions = () => {
  if (process.env.DATABASE_URL) {
    return {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
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
  return buildLocalConfig();
};

module.exports = {
  development: buildLocalConfig(),
  test: buildLocalConfig(),
  production: buildProductionConfig()
};
