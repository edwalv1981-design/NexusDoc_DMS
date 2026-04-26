const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    timestamps: true,
    updatedAt: false // Logs are immutable
});

module.exports = AuditLog;
