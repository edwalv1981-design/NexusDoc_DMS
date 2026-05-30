const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { Op } = require('sequelize');
const { User, AuditLog, FormData, DocumentTemplate, TemplateFieldSchema } = require('../models');
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

        const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase() + '@RESET';
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

        // DEFINIR RUTA SEGÚN PREFIJO OFICIAL
        let prefix = 'DOC';
        const nameNorm = templateName.toLowerCase();
        if (nameNorm.includes('corporacion') || nameNorm.includes('incorporacion')) prefix = 'PTLC';
        else if (nameNorm.includes('fundacion')) prefix = 'PTLF';
        else if (nameNorm.includes('fondos') || nameNorm.includes('sfar')) prefix = 'SFAR';
        else if (nameNorm.includes('cumplimiento_individual') || nameNorm.includes('individual')) prefix = 'KYCI';
        else if (nameNorm.includes('cumplimiento_entidades') || nameNorm.includes('entidad') || nameNorm.includes('entidades')) prefix = 'KYCE';

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
        let prefix = 'DOC';
        const nameNorm = name.toLowerCase();
        if (nameNorm.includes('corporacion') || nameNorm.includes('incorporacion')) prefix = 'PTLC';
        else if (nameNorm.includes('fundacion')) prefix = 'PTLF';
        else if (nameNorm.includes('fondos') || nameNorm.includes('sfar')) prefix = 'SFAR';
        else if (nameNorm.includes('cumplimiento_individual') || nameNorm.includes('individual')) prefix = 'KYCI';
        else if (nameNorm.includes('cumplimiento_entidades') || nameNorm.includes('entidad') || nameNorm.includes('entidades')) prefix = 'KYCE';
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

// @route   GET api/admin/search-person?q=<name_or_passport>
// @desc    Search across ALL form data for a person by name or passport/cedula
router.get('/search-person', [auth, isAdmin], async (req, res) => {
    try {
        const { nombres, ruc, codigoUnico, usuario, empresa, formType } = req.query;
        
        if (!nombres && !ruc && !codigoUnico && !usuario && !empresa && !formType) {
            return res.json({ results: [], summary: { totalResults: 0, uniqueForms: 0, uniqueUsers: 0, roles: [] } });
        }

        const conditions = [];
        const replacements = {};

        const nameTerms = nombres ? nombres.trim().split(/\s+/).filter(Boolean) : [];
        if (nameTerms.length > 0) {
            const subConds = nameTerms.map((_, i) => `(CAST(f.data AS TEXT) ILIKE :n_term${i} OR u.name ILIKE :n_term${i})`).join(' AND ');
            conditions.push(`(${subConds})`);
            nameTerms.forEach((t, i) => replacements[`n_term${i}`] = `%${t}%`);
        }

        if (nombres === 'DEBUG_EDWIN') {
            conditions.push(`CAST(f.data AS TEXT) ILIKE '%Edwin%'`);
        }

        if (ruc && ruc.trim()) {
            conditions.push(`CAST(f.data AS TEXT) ILIKE :ruc`);
            replacements.ruc = `%${ruc.trim()}%`;
        }
        
        if (codigoUnico && codigoUnico.trim()) {
            conditions.push(`(u.unique_code ILIKE :codigoUnico OR CAST(f.data AS TEXT) ILIKE :codigoUnico)`);
            replacements.codigoUnico = `%${codigoUnico.trim()}%`;
        }

        if (usuario && usuario.trim()) {
            conditions.push(`(u.name ILIKE :usuario OR u.email ILIKE :usuario)`);
            replacements.usuario = `%${usuario.trim()}%`;
        }

        if (empresa && empresa.trim()) {
            conditions.push(`CAST(f.data AS TEXT) ILIKE :empresa`);
            replacements.empresa = `%${empresa.trim()}%`;
        }

        const whereClauses = [];
        
        if (formType && formType.trim()) {
            whereClauses.push(`f.form_type = :formType`);
            replacements.formType = formType.trim();
        }

        if (conditions.length > 0) {
            whereClauses.push(`(${conditions.join(' OR ')})`);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const sql = `
            SELECT f.id         AS "formId",
                   f.form_type  AS "formType",
                   f.user_id    AS "userId",
                   f.created_at AS "createdAt",
                   f.updated_at AS "updatedAt",
                   u.name       AS "userName",
                   u.email      AS "userEmail",
                   u.unique_code AS "userCode",
                   f.data       AS "formData"
            FROM "form_data" f
            JOIN "users" u ON u.id = f.user_id
            ${whereClause}
            ORDER BY f.updated_at DESC
            LIMIT 150
        `;

        const [rows] = await sequelize.query(sql, { replacements });
        
        const results = [];
        const nameTermsLower = nameTerms.map(t => t.toLowerCase());

        rows.forEach(r => {
            let entityName = '';
            let d = {};
            try {
                d = typeof r.formData === 'string' ? JSON.parse(r.formData) : (r.formData || {});
            } catch (_) {}

            // If multiple name terms were provided, we must ensure they belong to a SINGLE entity in the form.
            // BUT if other fields were provided (like RUC) and they match, we shouldn't discard the row.
            // To be accurate, let's verify if the row strictly matches ANY of the provided criteria.
            let isValidMatch = false;

            const formText = JSON.stringify(d).toLowerCase();

            // Check Empresa match
            if (empresa && formText.includes(empresa.trim().toLowerCase())) isValidMatch = true;
            // Check RUC match
            if (ruc && formText.includes(ruc.trim().toLowerCase())) isValidMatch = true;
            // Check Codigo Unico match
            if (codigoUnico && (
                formText.includes(codigoUnico.trim().toLowerCase()) || 
                (r.userCode && r.userCode.toLowerCase().includes(codigoUnico.trim().toLowerCase()))
            )) isValidMatch = true;
            // Check Usuario match
            if (usuario && (
                (r.userName && r.userName.toLowerCase().includes(usuario.trim().toLowerCase())) || 
                (r.userEmail && r.userEmail.toLowerCase().includes(usuario.trim().toLowerCase()))
            )) isValidMatch = true;

            // Check Nombres match (Intelligent verification)
            // (Disabled temporarily to ensure the search returns results strictly based on Postgres ILIKE)
            isValidMatch = true;

            // If we provided some fields but none of the JS verifications passed, it's a cross-person false positive
            if (!isValidMatch) return;

            if (d) {
                entityName = d.companyName || d.corporationName || d.foundationName || d.nombreFundacion || d.fullName || d.name || d.accountHolder || d.beneficiaryName || 'N/A';
            }

            results.push({
                formId: r.formId,
                formType: r.formType,
                userId: r.userId,
                userName: r.userName,
                userEmail: r.userEmail,
                userCode: r.userCode,
                role: 'Mencionado en formulario',
                personName: d.fullName || d.beneficiaryName || d.name || entityName,
                personPassport: d.passport || d.idNumber || '',
                personDetails: {},
                entityName: entityName,
                formData: d,
                formDate: r.updatedAt
            });
        });
        res.json({
            results,
            summary: {
                totalResults: results.length,
                uniqueForms: new Set(results.map(r => r.formId)).size,
                uniqueUsers: new Set(results.map(r => r.userId)).size,
                roles: [...new Set(results.map(r => r.role))]
            }
        });
    } catch (err) {
        console.error('Error searching person:', err);
        res.status(500).json({ msg: 'Error al buscar persona: ' + err.message + ' Stack: ' + err.stack });
    }
});

// RAW SQL endpoint removed for security — use Supabase dashboard for ad-hoc queries.

module.exports = router;
