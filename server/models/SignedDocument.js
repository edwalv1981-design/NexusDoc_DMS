const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SignedDocument = sequelize.define('SignedDocument', {
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
        type: DataTypes.BLOB('long'),
        allowNull: false
    },
    signatureStatus: {
        type: DataTypes.STRING,
        defaultValue: 'Firma Pendiente' // Can be 'Firma Pendiente' or 'Firma Detectada'
    }
});

module.exports = SignedDocument;
