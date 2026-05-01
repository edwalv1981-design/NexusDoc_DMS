const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserDocument = sequelize.define('UserDocument', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fileData: {
        type: DataTypes.BLOB('long'), // For PostgreSQL BYTEA
        allowNull: false
    }
});

module.exports = UserDocument;
