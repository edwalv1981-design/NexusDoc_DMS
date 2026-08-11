const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Person = sequelize.define('Person', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  idNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passport: {
    type: DataTypes.STRING,
    allowNull: true
  },
  idCard: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: true
  },
  birthDate: {
    type: DataTypes.STRING,
    allowNull: true
  },
  birthPlace: {
    type: DataTypes.STRING,
    allowNull: true
  },
  maritalStatus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  entityType: {
    type: DataTypes.STRING,
    defaultValue: 'individual'
  },
  lastRoleLabel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  associatedForms: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'fullName']
    },
    {
      fields: ['userId', 'idNumber']
    },
    {
      fields: ['userId', 'passport']
    }
  ]
});

module.exports = Person;
