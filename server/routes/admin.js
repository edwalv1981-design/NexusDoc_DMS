const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { Op } = require('sequelize');
const { User, AuditLog, FormData, PendingRegistration, UserDocument, SignedDocument, DocumentTemplate, TemplateFieldSchema } = require('../models');
const { sequelize } = require('../config/db');
const templateFieldSchemaService = require('../services/templateFieldSchemaService');
const { sendTemporaryPassword } = require('../services/emailService');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for memory storage (we will save the buffer to the DB)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});
// El idioma se lee/escribe vía SQL raw en server/services/userLanguageStore.js

const auth = require('../middleware/auth');
const templateAvailability = require('../utils/templateAvailability');
const personCatalogService = require('../services/personCatalogService');

// Middleware to verify Admin role
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Acceso denegado: Se requiere rol de administrador' });
    }
    next();
};

// @route   GET api/admin/people/search
// @desc    Busca personas en el Catálogo Maestro con trámites asociados desglosados (Admin Only)
router.get('/people/search', [auth, isAdmin], async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const people = await personCatalogService.searchAdminPersonCatalog(q);
        res.json(people);
    } catch (err) {
        console.error('Error en /api/admin/people/search:', err);
        res.status(500).json({ msg: 'Error al buscar personas en el catálogo' });
    }
});

// @route   GET api/admin/users
// @desc    Get all users for management
router.get('/users', [auth, isAdmin], async (req, res) => {
    try {
        const users = await User.findAll({ 
            attributes: { exclude: ['password', 'securityCode'] },
            order: [['createdAt', 'DESC']],
            raw: true
        });

        // Fetch user profiles to attach roleOverride
        let profiles = [];
        try {
            const [results] = await sequelize.query(`SELECT "userId", "roleOverride" FROM "UserProfiles"`);
            profiles = results;
        } catch (e) {
            console.warn("UserProfiles query failed in GET /users, probably table does not exist yet.");
        }
        
        const profileMap = {};
        profiles.forEach(p => { profileMap[p.userId] = p.roleOverride; });

        users.forEach(u => {
            if (u.role === 'admin') {
                u.roleOverride = 'master';
            } else {
                u.roleOverride = profileMap[u.id] || 'client';
            }
        });

        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err.message);
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
            user.lockUntil = null;  // Desbloquear si tenía bloqueo temporal
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
// @desc    Delete user completely (Hard Purge across all tables)
router.delete('/users/:id', [auth, isAdmin], async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

        // Protect Master Admin from accidental deletion
        if (user.role === 'admin') {
            return res.status(403).json({ msg: 'No se puede eliminar la cuenta del Administrador Maestro.' });
        }

        const cleanEmail = user.email ? user.email.toLowerCase().trim() : '';

        console.log(`🗑️ Eliminación total iniciada para usuario ID: ${userId} (${cleanEmail})`);

        // 1. Purge UserDocument records
        if (UserDocument) {
            await UserDocument.destroy({ where: { userId } }).catch(e => console.warn('Purge UserDocument warning:', e.message));
        }

        // 2. Purge SignedDocument records
        if (SignedDocument) {
            await SignedDocument.destroy({ where: { userId } }).catch(e => console.warn('Purge SignedDocument warning:', e.message));
        }

        // 3. Purge FormData records submitted by this user
        if (FormData) {
            await FormData.destroy({ where: { userId } }).catch(e => console.warn('Purge FormData warning:', e.message));
        }

        // 4. Disassociate AuditLogs (set userId = null) so history is kept without blocking FK
        if (AuditLog) {
            await AuditLog.update({ userId: null }, { where: { userId } }).catch(e => console.warn('Disassociate AuditLogs warning:', e.message));
        }

        // 5. Purge UserProfiles
        await sequelize.query('DELETE FROM "UserProfiles" WHERE "userId" = :userId', {
            replacements: { userId }
        }).catch(e => console.warn('Purge UserProfiles warning:', e.message));

        // 6. Purge UserLanguages
        await sequelize.query('DELETE FROM "UserLanguages" WHERE "userId" = :userId', {
            replacements: { userId }
        }).catch(e => console.warn('Purge UserLanguages warning:', e.message));

        // 7. Purge PendingRegistration by email
        if (cleanEmail && PendingRegistration) {
            await PendingRegistration.destroy({ 
                where: { email: { [Op.iLike]: cleanEmail } } 
            }).catch(e => console.warn('Purge PendingRegistration warning:', e.message));
        }

        // 8. Hard-delete the User record
        await user.destroy({ force: true });

        // 9. Audit log the deletion action
        await AuditLog.create({
            userId: req.user.id,
            action: 'USER_DELETE',
            description: `Admin eliminó permanentemente al usuario ${cleanEmail} (ID: ${userId})`
        });

        console.log(`✅ Usuario ${cleanEmail} eliminado totalmente de todas las tablas.`);
        res.json({ msg: 'Usuario y toda su información fueron eliminados permanentemente.' });
    } catch (err) {
        console.error('❌ Error en eliminación total de usuario:', err);
        res.status(500).json({ msg: 'Error al eliminar el usuario de la base de datos: ' + err.message });
    }
});

// @route   POST api/admin/users/purge-inactive
// @desc    Purge all non-authorized / inactive users and orphan pending registrations
router.post('/users/purge-inactive', [auth, isAdmin], async (req, res) => {
    try {
        const inactiveUsers = await User.findAll({
            where: {
                status: { [Op.ne]: 'authorized' },
                role: { [Op.ne]: 'admin' }
            }
        });

        let purgedCount = 0;
        for (const user of inactiveUsers) {
            const userId = user.id;
            const cleanEmail = user.email ? user.email.toLowerCase().trim() : '';

            if (UserDocument) await UserDocument.destroy({ where: { userId } }).catch(() => {});
            if (SignedDocument) await SignedDocument.destroy({ where: { userId } }).catch(() => {});
            if (FormData) await FormData.destroy({ where: { userId } }).catch(() => {});
            if (AuditLog) await AuditLog.update({ userId: null }, { where: { userId } }).catch(() => {});
            await sequelize.query('DELETE FROM "UserProfiles" WHERE "userId" = :userId', { replacements: { userId } }).catch(() => {});
            await sequelize.query('DELETE FROM "UserLanguages" WHERE "userId" = :userId', { replacements: { userId } }).catch(() => {});
            if (cleanEmail && PendingRegistration) {
                await PendingRegistration.destroy({ where: { email: { [Op.iLike]: cleanEmail } } }).catch(() => {});
            }
            await user.destroy({ force: true });
            purgedCount++;
        }

        // Also clean up any old expired pending registrations
        if (PendingRegistration) {
            await PendingRegistration.destroy({
                where: {
                    createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }
            }).catch(() => {});
        }

        res.json({ msg: `Depuración completada. Se eliminaron ${purgedCount} usuarios no activos y registros huérfanos.` });
    } catch (err) {
        console.error('Error purging inactive users:', err);
        res.status(500).json({ msg: 'Error al realizar la depuración' });
    }
});

// @route   DELETE api/admin/users/by-email/:email
// @desc    Hard-purge user by email address across all tables
router.delete('/users/by-email/:email', [auth, isAdmin], async (req, res) => {
    try {
        const targetEmail = req.params.email ? req.params.email.toLowerCase().trim() : '';
        if (!targetEmail) return res.status(400).json({ msg: 'Correo inválido' });

        const users = await User.findAll({
            where: { email: { [Op.iLike]: targetEmail } }
        });

        if (users.length === 0) {
            await PendingRegistration.destroy({ where: { email: { [Op.iLike]: targetEmail } } }).catch(() => {});
            return res.json({ msg: `No existía usuario en la tabla principal. Se purgaron registros pendientes para ${targetEmail}.` });
        }

        let count = 0;
        for (const user of users) {
            if (user.role === 'admin') continue;
            const userId = user.id;
            if (UserDocument) await UserDocument.destroy({ where: { userId } }).catch(() => {});
            if (SignedDocument) await SignedDocument.destroy({ where: { userId } }).catch(() => {});
            if (FormData) await FormData.destroy({ where: { userId } }).catch(() => {});
            if (AuditLog) await AuditLog.update({ userId: null }, { where: { userId } }).catch(() => {});
            await sequelize.query('DELETE FROM "UserProfiles" WHERE "userId" = :userId', { replacements: { userId } }).catch(() => {});
            await sequelize.query('DELETE FROM "UserLanguages" WHERE "userId" = :userId', { replacements: { userId } }).catch(() => {});
            await user.destroy({ force: true });
            count++;
        }

        await PendingRegistration.destroy({ where: { email: { [Op.iLike]: targetEmail } } }).catch(() => {});

        res.json({ msg: `Depuración total por correo completada. Se eliminaron ${count} registro(s) para ${targetEmail}.` });
    } catch (err) {
        console.error('Error purging user by email:', err);
        res.status(500).json({ msg: 'Error al purgar usuario por correo' });
    }
});

// @route   POST api/admin/users/create
// @desc    Admin creates a new user
router.post('/users/create', [auth, isAdmin], async (req, res) => {
    try {
        const { name, email, idNumber, roleOverride } = req.body;
        if (!email || !name) return res.status(400).json({ msg: 'Nombre y correo son obligatorios' });

        const existing = await User.findOne({ where: { email } });
        if (existing) return res.status(400).json({ msg: 'El correo ya está registrado' });

        const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase() + '!@';
        const uniqueCode = `ADM-${Date.now()}-${crypto.randomInt(100, 999)}`;

        const newUser = await User.create({
            name,
            email,
            idNumber: idNumber || null,
            password: tempPassword,
            status: 'authorized',
            role: 'client', // The database role is always client
            mustChangePassword: true,
            uniqueCode
        });

        const profileStore = require('../services/userProfileStore');
        await profileStore.setProfile(newUser.id, {
            roleOverride: roleOverride || 'client',
            phone: '',
            address: '',
            createdBy: req.user.id
        });

        await sendTemporaryPassword(email, tempPassword);

        await AuditLog.create({
            userId: req.user.id,
            action: 'USER_CREATE',
            description: `Admin creó al usuario ${email} con rol ${roleOverride}`
        });

        res.json({ msg: 'Usuario creado con éxito y correo enviado', user: newUser });
    } catch (err) {
        console.error('Error creating user:', err.message);
        res.status(500).json({ msg: 'Error al crear usuario' });
    }
});

// @route   PUT api/admin/users/:id/role
// @desc    Admin changes a user's role
router.put('/users/:id/role', [auth, isAdmin], async (req, res) => {
    try {
        const { roleOverride } = req.body;
        if (!roleOverride) return res.status(400).json({ msg: 'El rol es obligatorio' });

        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

        const profileStore = require('../services/userProfileStore');
        
        // Ensure profile exists or update it
        await profileStore.setProfile(user.id, {
            roleOverride,
            phone: '',
            address: '',
            createdBy: req.user.id
        });

        await AuditLog.create({
            userId: req.user.id,
            action: 'USER_ROLE_CHANGE',
            description: `Admin cambió el rol de ${user.email} a ${roleOverride}`
        });

        res.json({ msg: `Rol de usuario actualizado a ${roleOverride}` });
    } catch (err) {
        console.error('Error al cambiar rol:', err.message);
        res.status(500).json({ msg: 'Error al cambiar el rol' });
    }
});

// @route   POST api/admin/users/:id/reset-password
// @desc    Admin resets a user's password manually
router.post('/users/:id/reset-password', [auth, isAdmin], async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

        const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase() + '@RESET';
        user.password = tempPassword;
        user.mustChangePassword = true;
        user.loginAttempts = 0; // Limpiar intentos fallidos al resetear
        user.lockUntil = null;  // Desbloquear al resetear
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
// @desc    Paginated audit logs (all dates by default; optional q, dateFrom, dateTo)
router.get('/logs', [auth, isAdmin], async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
        const q = (req.query.q || '').trim();
        const { dateFrom, dateTo } = req.query;

        const where = {};
        if (q) {
            where[Op.or] = [
                { action: { [Op.iLike]: `%${q}%` } },
                { description: { [Op.iLike]: `%${q}%` } }
            ];
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                where.createdAt[Op.lte] = end;
            }
        }

        const { count, rows } = await AuditLog.findAndCountAll({
            where,
            include: [{ model: User, attributes: ['name', 'email'] }],
            order: [['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit,
            distinct: true
        });

        res.json({
            logs: rows,
            total: count,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(count / limit))
        });
    } catch (err) {
        console.error('Error fetching audit logs:', err);
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

        // DEFINIR RUTA SEGÚN PREFIJO OFICIAL O NOMBRE PERSONALIZADO
        let prefix = templateName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/[^a-z0-9_-]/g, '_');
        const nameNorm = templateName.toLowerCase();
        if (nameNorm === 'corporacion' || nameNorm === 'incorporacion') prefix = 'PTLC';
        else if (nameNorm === 'fundaciones' || nameNorm === 'fundacion') prefix = 'PTLF';
        else if (nameNorm === 'fondos' || nameNorm === 'referencia_maestra' || nameNorm === 'sfar') prefix = 'SFAR';
        else if (nameNorm === 'cumplimiento_individual') prefix = 'KYCI';
        else if (nameNorm === 'cumplimiento_entidades') prefix = 'KYCE';

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

        let fieldExtraction = null;
        if (templateFieldSchemaService.isPdfTemplateName(templateName)) {
            try {
                fieldExtraction = await templateFieldSchemaService.persistExtraction(
                    TemplateFieldSchema,
                    templateName,
                    req.file.buffer,
                    null
                );
            } catch (extractErr) {
                console.error('⚠️ Extracción de campos PDF:', extractErr);
                fieldExtraction = {
                    fieldCount: 0,
                    fieldNames: [],
                    flatPdf: true,
                    extractError: extractErr.message,
                };
            }
        }

        await AuditLog.create({
            userId: req.user.id,
            action: 'TEMPLATE_UPLOAD',
            description: `Admin subió plantilla ${templateName} -> Guardada como ${fileName}${
                fieldExtraction ? ` (${fieldExtraction.fieldCount} campos AcroForm)` : ''
            }`
        });

        const processLabel = templateAvailability.adminTemplateIdToLabel(templateName);

        res.json({
            msg: `Plantilla guardada para ${processLabel}. Archivo: ${fileName}`,
            processLabel,
            templateName,
            fileName,
            path: filePath,
            detectedFields: fieldExtraction,
        });
    } catch (err) {
        console.error('🔥 Error al subir plantilla:', err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/templates
// @desc    Plantillas en DB + disponibilidad (disco / HTML)
router.get('/templates', [auth, isAdmin], async (req, res) => {
    try {
        const templates = await DocumentTemplate.findAll({
            attributes: ['id', 'name', 'updatedAt']
        });
        const normalized = templates.map(t => {
            const raw = t.toJSON ? t.toJSON() : t;
            if (raw.name === 'referencia_maestra') {
                raw.name = 'fondos';
            }
            return raw;
        });
        const statusRows = await templateAvailability.getAdminTemplateStatusRows(DocumentTemplate);
        res.json({ templates: normalized, status: statusRows });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/templates/status
// @desc    Mismo mapa de disponibilidad que usa el cliente
router.get('/templates/status', [auth, isAdmin], async (req, res) => {
    try {
        const statuses = await templateAvailability.getClientTemplateStatusMap(DocumentTemplate);
        res.json(statuses);
    } catch (err) {
        console.error('Error admin templates/status:', err);
        res.status(500).json({ msg: 'Error al verificar plantillas.' });
    }
});

// @route   DELETE api/admin/delete-template/:name
// @desc    Admin deletes a custom template from DB
router.delete('/delete-template/:name', [auth, isAdmin], async (req, res) => {
    try {
        const { name } = req.params;
        const { Op } = require('sequelize');
        const searchNames = name === 'fondos' ? ['fondos', 'referencia_maestra'] : [name];
        
        const count = await DocumentTemplate.destroy({
            where: {
                name: {
                    [Op.in]: searchNames
                }
            }
        });
        
        // DETERMINAR PREFIJO OFICIAL Y BORRAR ARCHIVO FÍSICO
        let prefix = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/[^a-z0-9_-]/g, '_');
        const nameNorm = name.toLowerCase();
        if (nameNorm === 'corporacion' || nameNorm === 'incorporacion') prefix = 'PTLC';
        else if (nameNorm === 'fundaciones' || nameNorm === 'fundacion') prefix = 'PTLF';
        else if (nameNorm === 'fondos' || nameNorm === 'referencia_maestra' || nameNorm === 'sfar') prefix = 'SFAR';
        else if (nameNorm === 'cumplimiento_individual') prefix = 'KYCI';
        else if (nameNorm === 'cumplimiento_entidades') prefix = 'KYCE';
        const filePath = path.join(__dirname, `../templates/${prefix}.pdf`);

        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Archivo físico de plantilla eliminado: ${filePath}`);
            } catch (err) {
                console.error(`⚠️ Error al eliminar archivo físico ${filePath}:`, err.message);
            }
        }

        if (count === 0 && !fs.existsSync(filePath)) {
            return res.status(404).json({ msg: 'Plantilla no encontrada' });
        }

        try {
            await templateFieldSchemaService.deleteSchemaForTemplate(TemplateFieldSchema, name);
        } catch (schemaErr) {
            console.warn('⚠️ No se pudo borrar esquema de campos:', schemaErr.message);
        }

        await AuditLog.create({
            userId: req.user.id,
            action: 'TEMPLATE_DELETE',
            description: `Admin eliminó plantilla personalizada: ${name} (Prefijo: ${prefix}, DB Rows: ${count})`
        });

        res.json({ msg: `Plantilla y archivo físico (${prefix}.pdf) eliminados correctamente. Filas eliminadas: ${count}` });
    } catch (err) {
        console.error('🔥 Error al eliminar plantilla:', err);
        res.status(500).send('Server error');
    }
});

// ---------------------------------------------------------------------------
// CONSULTAS — Admin search endpoints
// ---------------------------------------------------------------------------

// @route   GET api/admin/search-users?q=<query>
// @desc    Search users by name, email, uniqueCode or idNumber
router.get('/search-users', [auth, isAdmin], async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) return res.json([]);

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${q}%` } },
                    { email: { [Op.iLike]: `%${q}%` } },
                    { uniqueCode: { [Op.iLike]: `%${q}%` } },
                    { idNumber: { [Op.iLike]: `%${q}%` } }
                ]
            },
            attributes: ['id', 'name', 'email', 'uniqueCode', 'idNumber', 'nationality', 'role', 'status', 'createdAt'],
            order: [['name', 'ASC']],
            limit: 50
        });

        res.json(users);
    } catch (err) {
        console.error('Error searching users:', err);
        res.status(500).json({ msg: 'Error al buscar usuarios' });
    }
});

// @route   GET api/admin/user-forms/:userId
// @desc    Get ALL forms submitted by a specific user with summary data
router.get('/user-forms/:userId', [auth, isAdmin], async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'uniqueCode', 'idNumber', 'nationality', 'status']
        });
        if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

        const forms = await FormData.findAll({
            where: { userId },
            order: [['updatedAt', 'DESC']]
        });

        const summaries = forms.map(f => {
            const d = f.data || {};
            const summary = { formId: f.id, formType: f.formType, createdAt: f.createdAt, updatedAt: f.updatedAt };

            const ft = (f.formType || '').toLowerCase();
            if (ft.includes('corporacion') || ft.includes('incorporacion')) {
                summary.entityName = d.companyName || d.corporationName || '';
                summary.directorCount = Array.isArray(d.directors) ? d.directors.length : 0;
                summary.dignitaryCount = Array.isArray(d.dignitaries) ? d.dignitaries.length : 0;
                summary.shareholderCount = Array.isArray(d.shareholders) ? d.shareholders.length : 0;
            } else if (ft.includes('fundacion')) {
                summary.entityName = d.foundationName || d.nombreFundacion || '';
                summary.beneficiaryCount = Array.isArray(d.beneficiaries) ? d.beneficiaries.length : 0;
                summary.memberCount = Array.isArray(d.members) ? d.members.length : 0;
            } else if (ft.includes('cumplimiento') || ft.includes('kyc')) {
                summary.entityName = d.companyName || d.fullName || d.name || '';
            } else if (ft.includes('fondos')) {
                summary.entityName = d.accountHolder || d.beneficiaryName || '';
            }

            if (!summary.entityName) {
                summary.entityName = d.companyName || d.corporationName || d.foundationName
                    || d.nombreFundacion || d.fullName || d.name || d.accountHolder || '';
            }

            return summary;
        });

        res.json({ user, forms: summaries });
    } catch (err) {
        console.error('Error fetching user forms:', err);
        res.status(500).json({ msg: 'Error al obtener formularios del usuario' });
    }
});

function scanFormForMatches(d, terms) {
  if (!d || typeof d !== 'object' || !terms || terms.length === 0) return [];
  const matches = [];

  const checkObject = (obj, sectionName, roleName) => {
    if (!obj || typeof obj !== 'object') return;
    const str = JSON.stringify(obj).toLowerCase();
    const isMatch = terms.some(t => t && str.includes(t.toLowerCase().trim()));
    if (isMatch) {
      matches.push({
        section: sectionName,
        role: roleName,
        name: obj.fullName || obj.name || obj.legalRepName || obj.declarantName || obj.shareholder || '',
        idNumber: obj.passport || obj.idCard || obj.taxId || obj.idNumber || ''
      });
    }
  };

  // 1. Directores
  if (Array.isArray(d.directors)) {
    d.directors.forEach((dir, idx) => checkObject(dir, 'Directores', `Director #${idx + 1}`));
  }

  // 2. Dignatarios
  if (Array.isArray(d.dignitaries)) {
    d.dignitaries.forEach((dig, idx) => checkObject(dig, 'Dignatarios', dig.role ? `Dignatario (${dig.role})` : `Dignatario #${idx + 1}`));
  } else if (d.dignitaries && typeof d.dignitaries === 'object') {
    Object.entries(d.dignitaries).forEach(([role, dig]) => checkObject(dig, 'Dignatarios', `Dignatario (${role.toUpperCase()})`));
  }

  // 3. Accionistas / Suscriptores
  if (Array.isArray(d.shareholders)) {
    d.shareholders.forEach((s, idx) => checkObject(s, 'Accionistas', `Accionista #${idx + 1}`));
  }
  if (Array.isArray(d.subscribers)) {
    d.subscribers.forEach((s, idx) => checkObject(s, 'Suscriptores', `Suscriptor #${idx + 1}`));
  }

  // 4. Fundadores
  if (Array.isArray(d.founders)) {
    d.founders.forEach((f, idx) => checkObject(f, 'Fundadores', `Fundador #${idx + 1}`));
  } else if (d.founder) {
    checkObject(d.founder, 'Fundadores', 'Fundador');
  }

  // 5. Consejo Fundacional
  if (Array.isArray(d.councilMembers)) {
    d.councilMembers.forEach((m, idx) => checkObject(m, 'Consejo Fundacional', `Miembro #${idx + 1}`));
  }

  // 6. Protectores
  if (Array.isArray(d.protectors)) {
    d.protectors.forEach((p, idx) => checkObject(p, 'Protectores', `Protector #${idx + 1}`));
  } else if (d.protector) {
    checkObject(d.protector, 'Protectores', 'Protector Principal');
  }

  // 7. Beneficiarios
  if (Array.isArray(d.beneficiaries)) {
    d.beneficiaries.forEach((b, idx) => checkObject(b, 'Beneficiarios', `Beneficiario #${idx + 1}`));
  }
  if (Array.isArray(d.beneficialOwners)) {
    d.beneficialOwners.forEach((b, idx) => checkObject(b, 'Beneficiarios Finales', `Beneficiario Final #${idx + 1}`));
  }

  // 8. Firmantes
  if (Array.isArray(d.signers)) {
    d.signers.forEach((s, idx) => checkObject(s, 'Firmantes Autorizados', `Firmante #${idx + 1}`));
  }

  // 9. Campos de Personas Únicas
  if (d.legalRepName || d.legalRepId) {
    checkObject({ fullName: d.legalRepName, passport: d.legalRepId }, 'Representante Legal', 'Representante Legal');
  }
  if (d.poaFullName || d.poaPassport) {
    checkObject({ fullName: d.poaFullName, passport: d.poaPassport, phone: d.poaPhone, email: d.poaEmail }, 'Apoderados', 'Apoderado General');
  }
  if (d.declarantName || d.declarationName) {
    checkObject({ fullName: d.declarantName || d.declarationName }, 'Declarante', 'Declarante');
  }

  return matches;
}

function extractAllParticipantsFromForm(d) {
  if (!d || typeof d !== 'object') return [];
  const participants = [];

  const addP = (role, name, idNumber, nationality, email, phone) => {
    if (!name && !idNumber && !email) return;
    participants.push({
      role: role || 'Participante',
      name: name || 'Sin Nombre',
      idNumber: idNumber || '',
      nationality: nationality || '',
      email: email || '',
      phone: phone || ''
    });
  };

  // Directores
  if (Array.isArray(d.directors)) {
    d.directors.forEach((dir, i) => {
      addP(`Director #${i+1}`, dir.fullName || dir.name, dir.passport || dir.idNumber || dir.idCard, dir.nationality, dir.email, dir.phone);
    });
  }

  // Dignatarios
  if (Array.isArray(d.dignitaries)) {
    d.dignitaries.forEach((dig, i) => {
      addP(dig.role ? `Dignatario (${dig.role})` : `Dignatario #${i+1}`, dig.fullName || dig.name, dig.passport || dig.idNumber, dig.nationality, dig.email, dig.phone);
    });
  } else if (d.dignitaries && typeof d.dignitaries === 'object') {
    Object.entries(d.dignitaries).forEach(([role, dig]) => {
      if (dig && typeof dig === 'object') {
        addP(`Dignatario (${role.toUpperCase()})`, dig.fullName || dig.name, dig.passport || dig.idNumber, dig.nationality, dig.email, dig.phone);
      }
    });
  }

  // Accionistas
  if (Array.isArray(d.shareholders)) {
    d.shareholders.forEach((s, i) => {
      addP(`Accionista #${i+1}`, s.fullName || s.name || s.shareholder, s.passport || s.idNumber || s.idCard || s.taxId, s.nationality, s.email, s.phone);
    });
  }

  // Fundadores
  if (Array.isArray(d.founders)) {
    d.founders.forEach((f, i) => {
      addP(`Fundador #${i+1}`, f.fullName || f.name, f.passport || f.idNumber, f.nationality, f.email, f.phone);
    });
  } else if (d.founder && typeof d.founder === 'object') {
    addP('Fundador', d.founder.fullName || d.founder.name, d.founder.passport || d.founder.idNumber, d.founder.nationality, d.founder.email, d.founder.phone);
  }

  // Beneficiarios
  if (Array.isArray(d.beneficiaries)) {
    d.beneficiaries.forEach((b, i) => {
      addP(`Beneficiario #${i+1}`, b.fullName || b.name, b.passport || b.idNumber, b.nationality, b.email, b.phone);
    });
  }
  if (Array.isArray(d.beneficialOwners)) {
    d.beneficialOwners.forEach((b, i) => {
      addP(`Beneficiario Final #${i+1}`, b.fullName || b.name, b.passport || b.idNumber, b.nationality, b.email, b.phone);
    });
  }

  // Firmantes
  if (Array.isArray(d.signers)) {
    d.signers.forEach((s, i) => {
      addP(`Firmante Autorizado #${i+1}`, s.fullName || s.name, s.passport || s.idNumber, s.nationality, s.email, s.phone);
    });
  }

  // Persona individual o campos raíz
  if (d.fullName || d.name) {
    addP('Titular / Solicitante', d.fullName || d.name, d.passport || d.idNumber || d.idCard, d.nationality, d.email, d.phone);
  }
  if (d.legalRepName || d.legalRepId) {
    addP('Representante Legal', d.legalRepName, d.legalRepId, d.legalRepNationality, d.legalRepEmail, d.legalRepPhone);
  }
  if (d.poaFullName || d.poaPassport) {
    addP('Apoderado General', d.poaFullName, d.poaPassport, d.poaNationality, d.poaEmail, d.poaPhone);
  }

  return participants;
}

// @route   GET api/admin/search-person?q=<name_or_passport>
// @desc    Search across ALL form data for a person by name or passport/cedula
router.get('/search-person', [auth, isAdmin], async (req, res) => {
    try {
        const { nombres, ruc, codigoUnico, usuario, empresa, formType } = req.query;
        
        // Trigger asynchronous historical backfill for person catalog to ensure complete indexing
        personCatalogService.backfillHistoricalData().catch(e => console.warn('Async backfill error:', e.message));

        let forms = [];
        try {
            const whereClauses = [];

            if (formType && formType.trim()) {
                const ft = formType.trim().toLowerCase();
                let pattern = `%${ft}%`;
                if (ft.includes('corporac') || ft.includes('incorporac')) pattern = '%corporac%';
                else if (ft.includes('fundac')) pattern = '%fundac%';
                else if (ft.includes('entidad')) pattern = '%entidad%';
                else if (ft.includes('individual')) pattern = '%individual%';
                else if (ft.includes('fondo')) pattern = '%fondo%';

                whereClauses.push(sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('FormData.formType')),
                    { [Op.like]: pattern }
                ));
            }

            const searchConds = [];

            if (nombres && nombres.trim()) {
                const rawName = nombres.trim();
                const cleanName = rawName.replace(/[^a-zA-Z0-9\s]/g, '');
                searchConds.push(
                    sequelize.where(sequelize.cast(sequelize.col('FormData.data'), 'text'), { [Op.iLike]: `%${rawName}%` }),
                    sequelize.where(sequelize.col('User.name'), { [Op.iLike]: `%${rawName}%` })
                );
                if (cleanName && cleanName !== rawName) {
                    searchConds.push(
                        sequelize.where(sequelize.cast(sequelize.col('FormData.data'), 'text'), { [Op.iLike]: `%${cleanName}%` })
                    );
                }
            }

            if (ruc && ruc.trim()) {
                const rawRuc = ruc.trim();
                const cleanRuc = rawRuc.replace(/[^a-zA-Z0-9]/g, '');
                searchConds.push(
                    sequelize.where(sequelize.cast(sequelize.col('FormData.data'), 'text'), { [Op.iLike]: `%${rawRuc}%` })
                );
                if (cleanRuc && cleanRuc !== rawRuc) {
                    searchConds.push(
                        sequelize.where(sequelize.cast(sequelize.col('FormData.data'), 'text'), { [Op.iLike]: `%${cleanRuc}%` })
                    );
                }
            }

            if (codigoUnico && codigoUnico.trim()) {
                const code = codigoUnico.trim();
                searchConds.push(
                    sequelize.where(sequelize.col('User.uniqueCode'), { [Op.iLike]: `%${code}%` }),
                    sequelize.where(sequelize.cast(sequelize.col('FormData.data'), 'text'), { [Op.iLike]: `%${code}%` })
                );
            }

            if (usuario && usuario.trim()) {
                const uTerm = usuario.trim();
                searchConds.push(
                    sequelize.where(sequelize.col('User.name'), { [Op.iLike]: `%${uTerm}%` }),
                    sequelize.where(sequelize.col('User.email'), { [Op.iLike]: `%${uTerm}%` })
                );
            }

            if (empresa && empresa.trim()) {
                searchConds.push(
                    sequelize.where(sequelize.cast(sequelize.col('FormData.data'), 'text'), { [Op.iLike]: `%${empresa.trim()}%` })
                );
            }

            if (searchConds.length > 0) {
                whereClauses.push({ [Op.or]: searchConds });
            }

            const finalWhere = whereClauses.length > 0 ? { [Op.and]: whereClauses } : {};

            forms = await FormData.findAll({
                where: finalWhere,
                include: [{
                    model: User,
                    required: false,
                    attributes: ['id', 'name', 'email', 'uniqueCode']
                }],
                order: [['updatedAt', 'DESC']],
                limit: 150
            });
        } catch (ormErr) {
            console.error('Sequelize ORM search error in admin search-person, falling back to raw query:', ormErr.message);
            const [rawRows] = await sequelize.query(`
                SELECT f.id AS "formId", f."formType", f."userId", f."createdAt", f."updatedAt",
                       u.name AS "userName", u.email AS "userEmail", u."uniqueCode" AS "userCode", f.data AS "formData"
                FROM "${FormData.tableName || 'FormData'}" f
                LEFT JOIN "Users" u ON u.id = f."userId"
                ORDER BY f."updatedAt" DESC LIMIT 150
            `);
            forms = rawRows.map(r => ({
                id: r.formId,
                formType: r.formType,
                userId: r.userId,
                updatedAt: r.updatedAt,
                User: { name: r.userName, email: r.userEmail, uniqueCode: r.userCode },
                data: typeof r.formData === 'string' ? JSON.parse(r.formData) : r.formData
            }));
        }

        // Also search in Master Person Catalog
        let catalogPeople = [];
        try {
            const searchTerm = nombres || ruc || usuario || empresa || codigoUnico || '';
            catalogPeople = await personCatalogService.searchAdminPersonCatalog(searchTerm);
        } catch (catErr) {
            console.error('Catalog admin search error:', catErr);
        }

        const results = [];
        const searchTermsList = [nombres, ruc, codigoUnico, usuario, empresa].filter(Boolean);

        forms.forEach(f => {
            const d = f.data || {};
            const u = f.User || {};

            const matchedSections = scanFormForMatches(d, searchTermsList);
            const participants = extractAllParticipantsFromForm(d);

            let entityName = d.companyName || d.corporationName || d.foundationName || d.nombreFundacion || d.accountHolder || d.fullName || d.name || d.beneficiaryName || '';
            if (!entityName || entityName === 'N/A') {
                if (matchedSections.length > 0 && matchedSections[0].name) {
                    entityName = `${matchedSections[0].name} (${matchedSections[0].idNumber || u.uniqueCode || 'Trámite'})`;
                } else if (participants.length > 0 && participants[0].name) {
                    entityName = `${participants[0].name} (${participants[0].idNumber || u.uniqueCode || 'Trámite'})`;
                } else if (u.uniqueCode) {
                    entityName = `Trámite ${u.uniqueCode}`;
                } else {
                    entityName = `${f.formType} (ID: ${String(f.id).substring(0, 8)})`;
                }
            }

            const rolesList = matchedSections.map(s => s.role);
            const mainRole = rolesList.length > 0 ? rolesList.join(' / ') : 'Mencionado en Formulario';

            results.push({
                formId: f.id,
                formType: f.formType,
                userId: f.userId,
                userName: u.name || 'Usuario Registrado',
                userEmail: u.email || '',
                userCode: u.uniqueCode || '',
                role: mainRole,
                matchedSections,
                participants,
                personName: d.fullName || d.beneficiaryName || d.name || entityName,
                personPassport: d.passport || d.idNumber || '',
                personDetails: {},
                entityName: entityName,
                formData: d,
                formDate: f.updatedAt
            });
        });

        res.json({
            results,
            catalogPeople,
            summary: {
                totalResults: results.length,
                uniqueForms: new Set(results.map(r => r.formId)).size,
                uniqueUsers: new Set(results.map(r => r.userId)).size,
                roles: [...new Set(results.map(r => r.role))]
            }
        });
    } catch (err) {
        console.error('Error searching person:', err);
        res.status(500).json({ msg: 'Error al buscar persona: ' + err.message });
    }
});

module.exports = router;
