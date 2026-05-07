'use strict';

const { DataTypes } = require('sequelize');

const USER_ROLES = ['admin', 'client'];
const USER_STATUSES = ['pending', 'authorized', 'revoked', 'blocked'];

async function tableExists(queryInterface, tableName) {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (error) {
    return false;
  }
}

async function createUsers(queryInterface, Sequelize) {
  if (await tableExists(queryInterface, 'Users')) return;

  await queryInterface.createTable('Users', {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      allowNull: false,
      primaryKey: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    nationality: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM(...USER_ROLES), allowNull: false, defaultValue: 'client' },
    status: { type: DataTypes.ENUM(...USER_STATUSES), allowNull: false, defaultValue: 'pending' },
    login_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    active_token: { type: DataTypes.TEXT, allowNull: true },
    initial_form: { type: DataTypes.STRING, allowNull: true },
    id_number: { type: DataTypes.STRING, allowNull: true, unique: true },
    unique_code: { type: DataTypes.STRING, allowNull: true, unique: true },
    security_code: { type: DataTypes.STRING, allowNull: true },
    code_expires_at: { type: DataTypes.DATE, allowNull: true },
    code_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lock_until: { type: DataTypes.DATE, allowNull: true },
    must_change_password: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
  });
}

async function createPendingRegistrations(queryInterface, Sequelize) {
  if (await tableExists(queryInterface, 'PendingRegistrations')) return;

  await queryInterface.createTable('PendingRegistrations', {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      allowNull: false,
      primaryKey: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    nationality: { type: DataTypes.STRING, allowNull: true },
    initial_form: { type: DataTypes.STRING, allowNull: true },
    id_number: { type: DataTypes.STRING, allowNull: true },
    code: { type: DataTypes.STRING, allowNull: false },
    code_expires_at: { type: DataTypes.DATE, allowNull: true },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lock_until: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
  });
}

async function createFormData(queryInterface, Sequelize) {
  if (await tableExists(queryInterface, 'FormData')) return;

  await queryInterface.createTable('FormData', {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    form_type: { type: DataTypes.STRING, allowNull: false },
    user_unique_code: { type: DataTypes.STRING, allowNull: true },
    data: { type: DataTypes.JSONB, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
  });
}

async function createAuditLogs(queryInterface, Sequelize) {
  if (await tableExists(queryInterface, 'AuditLogs')) return;

  await queryInterface.createTable('AuditLogs', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    action: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
  });
}

async function createDocumentTemplates(queryInterface, Sequelize) {
  if (await tableExists(queryInterface, 'DocumentTemplates')) return;

  await queryInterface.createTable('DocumentTemplates', {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      allowNull: false,
      primaryKey: true
    },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    file_data: { type: DataTypes.BLOB('long'), allowNull: false },
    uploaded_by: { type: DataTypes.UUID, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
  });
}

async function createUserDocuments(queryInterface, Sequelize) {
  if (await tableExists(queryInterface, 'UserDocuments')) return;

  await queryInterface.createTable('UserDocuments', {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    filename: { type: DataTypes.STRING, allowNull: false },
    file_data: { type: DataTypes.BLOB('long'), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
  });
}

async function createSignedDocuments(queryInterface, Sequelize) {
  if (await tableExists(queryInterface, 'SignedDocuments')) return;

  await queryInterface.createTable('SignedDocuments', {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    filename: { type: DataTypes.STRING, allowNull: false },
    file_data: { type: DataTypes.BLOB('long'), allowNull: false },
    signature_status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Firma Pendiente' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
  });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await createUsers(queryInterface, Sequelize);
    await createPendingRegistrations(queryInterface, Sequelize);
    await createFormData(queryInterface, Sequelize);
    await createAuditLogs(queryInterface, Sequelize);
    await createDocumentTemplates(queryInterface, Sequelize);
    await createUserDocuments(queryInterface, Sequelize);
    await createSignedDocuments(queryInterface, Sequelize);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SignedDocuments');
    await queryInterface.dropTable('UserDocuments');
    await queryInterface.dropTable('DocumentTemplates');
    await queryInterface.dropTable('AuditLogs');
    await queryInterface.dropTable('FormData');
    await queryInterface.dropTable('PendingRegistrations');
    await queryInterface.dropTable('Users');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_role"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_status"');
  }
};
