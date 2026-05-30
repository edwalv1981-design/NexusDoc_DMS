const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FormData = sequelize.define('FormData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  formType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userUniqueCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  timestamps: true
});

module.exports = FormData;
