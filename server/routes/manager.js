const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { User, AuditLog } = require('../models');
const { sequelize } = require('../config/db');
const { sendTemporaryPassword } = require('../services/emailService');
const profileStore = require('../services/userProfileStore');
const auth = require('../middleware/auth');

// Middleware to verify Manager role
const isManager = async (req, res, next) => {
    try {
        const profile = await profileStore.getProfile(req.user.id);
        if (profile && profile.roleOverride === 'manager') {
            return next();
        }
        return res.status(403).json({ msg: 'Acceso denegado: Se requiere rol de Administrador' });
    } catch (err) {
        return res.status(500).json({ msg: 'Error de validación de rol' });
    }
};

// @route   POST api/manager/sub-users
// @desc    Manager creates a new sub-user
router.post('/sub-users', [auth, isManager], async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        if (!email || !name) return res.status(400).json({ msg: 'Nombre y correo son obligatorios' });

        const existing = await User.findOne({ where: { email } });
        if (existing) return res.status(400).json({ msg: 'El correo ya está registrado' });

        const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase() + '!@';
        const uniqueCode = `SUB-${Date.now()}-${crypto.randomInt(100, 999)}`;

        const newUser = await User.create({
            name,
            email,
            password: tempPassword,
            status: 'authorized',
            role: 'client', // The database role is always client
            mustChangePassword: true,
            uniqueCode
        });

        await profileStore.setProfile(newUser.id, {
            roleOverride: 'client',
            phone: phone || '',
            address: address || '',
            createdBy: req.user.id
        });

        await sendTemporaryPassword(email, tempPassword);

        await AuditLog.create({
            userId: req.user.id,
            action: 'SUBUSER_CREATE',
            description: `Manager creó al sub-usuario ${email}`
        });

        res.json({ msg: 'Usuario creado con éxito y correo enviado', user: { id: newUser.id, name, email, phone, address } });
    } catch (err) {
        console.error('Error creating sub-user:', err.message);
        res.status(500).json({ msg: 'Error al crear usuario' });
    }
});

// @route   GET api/manager/sub-users
// @desc    Get all sub-users created by the manager
router.get('/sub-users', [auth, isManager], async (req, res) => {
    try {
        const [results] = await sequelize.query(`
            SELECT u.id, u.name, u.email, u.status, u."createdAt", p.phone, p.address 
            FROM "Users" u
            JOIN "UserProfiles" p ON u.id = p."userId"
            WHERE p."createdBy" = :managerId
            ORDER BY u."createdAt" DESC
        `, {
            replacements: { managerId: req.user.id }
        });

        res.json(results);
    } catch (err) {
        console.error('Error fetching sub-users:', err.message);
        res.status(500).json({ msg: 'Error al obtener usuarios' });
    }
});

module.exports = router;
