'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
/** @param {import('sequelize').Sequelize} Sequelize */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name));
  return normalized.some((t) => String(t).toLowerCase() === tableName.toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, 'template_field_schemas')) return;

    await queryInterface.createTable('template_field_schemas', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      template_name: { type: Sequelize.STRING, allowNull: false, unique: true },
      form_type: { type: Sequelize.STRING, allowNull: true },
      acro_fields: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      field_mapping: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      schema_source: { type: Sequelize.STRING, allowNull: false, defaultValue: 'static' },
      extracted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'template_field_schemas')) {
      await queryInterface.dropTable('template_field_schemas');
    }
  },
};
