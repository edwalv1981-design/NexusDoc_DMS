const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TemplateFieldSchema = sequelize.define(
  'TemplateFieldSchema',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    templateName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    formType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    acroFields: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    fieldMapping: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    schemaSource: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'static',
    },
    extractedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = TemplateFieldSchema;
