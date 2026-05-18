const express = require('express');
const router = express.Router();
const { User, AuditLog, DocumentTemplate } = require('../models');
const { sendTemporaryPassword } = require('../services/emailService');
const multer = require('multer');

// Configure multer for memory storage (we will save the buffer to the DB)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

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

// @route   POST api/admin/upload-template
// @desc    Admin uploads a new PDF template to DB
router.post('/upload-template', [auth, isAdmin, upload.single('template')], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No se subió ningún archivo' });
        }

        const templateName = req.body.name || req.file.originalname;

        // DEFINIR RUTA SEGÚN PREFIJO OFICIAL
        let prefix = 'DOC';
        const nameNorm = templateName.toLowerCase();
        if (nameNorm.includes('corporacion') || nameNorm.includes('incorporacion')) prefix = 'PTLC';
        else if (nameNorm.includes('fundacion')) prefix = 'PTLF';
        else if (nameNorm.includes('fondos') || nameNorm.includes('sfar')) prefix = 'SFAR';

        const templatesDir = path.join(__dirname, '../templates');
        if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

        const fileName = `${prefix}.pdf`;
        const filePath = path.join(templatesDir, fileName);

        // 1. GUARDAR EN SISTEMA DE ARCHIVOS (Ruta Directa)
        fs.writeFileSync(filePath, req.file.buffer);
        console.log(`💾 Plantilla guardada en ruta: ${filePath}`);

        // 2. RESPALDO EN BASE DE DATOS (Opcional pero recomendado para consistencia)
        let template = await DocumentTemplate.findOne({ where: { name: templateName } });
        if (template) {
            template.fileData = req.file.buffer;
            template.uploadedBy = req.user.id;
            await template.save();
        } else {
            await DocumentTemplate.create({
                name: templateName,
                fileData: req.file.buffer,
                uploadedBy: req.user.id
            });
        }

        await AuditLog.create({
            userId: req.user.id,
            action: 'TEMPLATE_UPLOAD',
            description: `Admin subió plantilla ${templateName} -> Guardada como ${fileName}`
        });

        res.json({ 
            msg: `Plantilla subida exitosamente. Guardada físicamente como ${fileName} y respaldada en DB.`,
            path: filePath 
        });
    } catch (err) {
        console.error('🔥 Error al subir plantilla:', err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/templates
// @desc    Get list of templates (metadata only)
router.get('/templates', [auth, isAdmin], async (req, res) => {
    try {
        const templates = await DocumentTemplate.findAll({
            attributes: ['id', 'name', 'updatedAt']
        });
        res.json(templates);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/admin/delete-template/:name
// @desc    Admin deletes a custom template from DB
router.delete('/delete-template/:name', [auth, isAdmin], async (req, res) => {
    try {
        const { name } = req.params;
        const template = await DocumentTemplate.findOne({ where: { name } });
        
        if (!template) {
            return res.status(404).json({ msg: 'Plantilla no encontrada' });
        }

        // DETERMINAR PREFIJO OFICIAL Y BORRAR ARCHIVO FÍSICO
        let prefix = 'DOC';
        const nameNorm = name.toLowerCase();
        if (nameNorm.includes('corporacion') || nameNorm.includes('incorporacion')) prefix = 'PTLC';
        else if (nameNorm.includes('fundacion')) prefix = 'PTLF';
        else if (nameNorm.includes('fondos') || nameNorm.includes('sfar')) prefix = 'SFAR';

        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, `../templates/${prefix}.pdf`);

        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Archivo físico de plantilla eliminado: ${filePath}`);
            } catch (err) {
                console.error(`⚠️ Error al eliminar archivo físico ${filePath}:`, err.message);
            }
        }

        await template.destroy();

        await AuditLog.create({
            userId: req.user.id,
            action: 'TEMPLATE_DELETE',
            description: `Admin eliminó plantilla personalizada: ${name} (Prefijo: ${prefix})`
        });

        res.json({ msg: `Plantilla y archivo físico (${prefix}.pdf) eliminados correctamente.` });
    } catch (err) {
        console.error('🔥 Error al eliminar plantilla:', err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
