const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DocumentTemplate = sequelize.define('DocumentTemplate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    fileData: {
        type: DataTypes.BLOB('long'), // For PostgreSQL, this translates to BYTEA
        allowNull: false
    },
    uploadedBy: {
        type: DataTypes.UUID,
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = DocumentTemplate;
