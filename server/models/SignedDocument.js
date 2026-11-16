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
        // Antiguos: 'Firma Pendiente' / 'Firma Detectada'. Nuevos: ver services/signatureService.STATUS
        defaultValue: 'Firma Pendiente'
    },
    // Detalle de la verificación: resultado, firmantes, cadena de confianza,
    // coincidencia con el usuario y revisión del administrador (aditivo, opcional).
    verification: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    // Huella SHA-256 del archivo entregado (evidencia de integridad).
    fileHash: {
        type: DataTypes.STRING(64),
        allowNull: true
    }
});

module.exports = SignedDocument;
