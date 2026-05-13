const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nationality: {
        type: DataTypes.STRING,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('admin', 'client'),
        defaultValue: 'client'
    },
    status: {
        type: DataTypes.ENUM('pending', 'authorized', 'revoked', 'blocked'),
        defaultValue: 'pending'
    },
    loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    activeToken: {
        type: DataTypes.TEXT, // Almacena el JWT actual para control de sesión única
        allowNull: true
    },
    initialForm: {
        type: DataTypes.STRING,
    },
    idNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    uniqueCode: {
        type: DataTypes.STRING,
        unique: true
    },
    securityCode: {
        type: DataTypes.STRING,
    },
    codeExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    codeAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    lockUntil: {
        type: DataTypes.DATE,
        allowNull: true
    },
    mustChangePassword: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // language es allowNull true a propósito: la columna puede aún no existir en
    // ambientes donde no corrió el ALTER TABLE defensivo (ver server/index.js).
    // Cuando falta o llega null, la app la trata como 'es'.
    language: {
        type: DataTypes.STRING(2),
        allowNull: true,
        defaultValue: 'es'
    }
}, {
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

// Instance method to check password
User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
