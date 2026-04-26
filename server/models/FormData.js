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
  data: {
    type: DataTypes.JSONB,
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = FormData;
