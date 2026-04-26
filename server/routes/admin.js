const express = require('express');
const router = express.Router();
const { User, AuditLog } = require('../models');
const { sendTemporaryPassword } = require('../services/emailService');

const auth = require('../middleware/auth');

// Middleware to verify Admin role
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Acceso denegado: Se requiere rol de administrador' });
    }
    next();
};

// @route   GET api/admin/users
// @desc    Get all users for management
router.get('/users', [auth, isAdmin], async (req, res) => {
    try {
        const users = await User.findAll({ 
            attributes: { exclude: ['password', 'securityCode'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/users/:id/status
// @desc    Change user status (authorize, revoke)
router.put('/users/:id/status', [auth, isAdmin], async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

        // If becoming authorized, just reset attempts and proceed
        if (status === 'authorized') {
            user.loginAttempts = 0; // Limpiar intentos fallidos al activar
        }

        user.status = status;
        await user.save();
        console.log(`💾 Estado de usuario ${user.email} actualizado a ${status}`);

        await AuditLog.create({
            userId: req.user.id,
            action: 'USER_STATUS_CHANGE',
            description: `Admin cambió estado de ${user.email} a ${status}`
        });

        res.json(user);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete user
router.delete('/users/:id', [auth, isAdmin], async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

        const email = user.email;
        await user.destroy();

        await AuditLog.create({
            userId: req.user.id,
            action: 'USER_DELETE',
            description: `Admin eliminó al usuario ${email}`
        });

        res.json({ msg: 'Usuario eliminado' });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   POST api/admin/users/:id/reset-password
// @desc    Admin resets a user's password manually
router.post('/users/:id/reset-password', [auth, isAdmin], async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

        const tempPassword = Math.random().toString(36).slice(-8).toUpperCase() + '@RESET';
        user.password = tempPassword;
        user.mustChangePassword = true;
        user.loginAttempts = 0; // Limpiar intentos fallidos al resetear
        await user.save();

        await sendTemporaryPassword(user.email, tempPassword);

        await AuditLog.create({
            userId: req.user.id,
            action: 'USER_PASSWORD_RESET',
            description: `Admin reseteó manualmente la contraseña de ${user.email}`
        });

        res.json({ msg: 'Contraseña reseteada y enviada al correo del usuario' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/logs
// @desc    Get all audit logs
router.get('/logs', [auth, isAdmin], async (req, res) => {
    try {
        const logs = await AuditLog.findAll({ 
            include: [{ model: User, attributes: ['name', 'email'] }],
            order: [['createdAt', 'DESC']] 
        });
        res.json(logs);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
