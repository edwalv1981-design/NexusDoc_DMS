const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { User, AuditLog, PendingRegistration } = require('../models');
const { sequelize } = require('../config/db');
const { sendSecurityCode, sendTemporaryPassword } = require('../services/emailService');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const JWT_SECRET = process.env.JWT_SECRET;

const stablePdfForms = require('../config/stablePdfForms');
const userLanguageStore = require('../services/userLanguageStore');

const generateUniqueCode = async (formType) => {
    const prefix = stablePdfForms.UNIQUE_CODE_PREFIX_BY_FORM_TYPE[formType] || 'NDOC';
    const date = new Date();
    const dateStr = date.getFullYear() + 
                  String(date.getMonth() + 1).padStart(2, '0') + 
                  String(date.getDate()).padStart(2, '0');
    
    const searchPattern = `${prefix}-${dateStr}-%`;
    
    // Find last sequence for today and this prefix
    const lastUser = await User.findOne({
        where: {
            uniqueCode: { [Op.like]: searchPattern }
        },
        order: [['uniqueCode', 'DESC']]
    });

    let nextSequence = 1;
    if (lastUser && lastUser.uniqueCode) {
        const parts = lastUser.uniqueCode.split('-');
        const lastSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastSeq)) nextSequence = lastSeq + 1;
    }

    return `${prefix}-${dateStr}-${String(nextSequence).padStart(3, '0')}`;
};

// @route   POST api/auth/register
// @desc    Register user (step 1: store pending & send code)
router.post('/register', async (req, res) => {
    try {
        const { name, nationality, email, initialForm, idNumber } = req.body;

        if (!idNumber) {
            return res.status(400).json({ msg: 'La cédula de identidad es obligatoria para el registro.' });
        }

        // Blindaje de Identidad Doble (Cédula y Email)
        let existingUser = await User.findOne({ 
            where: { 
                [Op.or]: [
                    { email },
                    { idNumber: idNumber || '---NONE---' }
                ]
            } 
        });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(400).json({ msg: 'El correo electrónico ya está registrado en el sistema.' });
            }
            if (existingUser.idNumber === idNumber) {
                return res.status(400).json({ msg: 'La cédula de identidad ya está registrada en el sistema.' });
            }
        }

        // Cleanup any old pending attempts for this email
        await PendingRegistration.destroy({ where: { email } });

        // Generate Security Code
        const securityCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Update or create pending registration
        await PendingRegistration.upsert({
            name,
            nationality,
            email,
            initialForm,
            idNumber,
            code: securityCode,
            codeExpiresAt: new Date(Date.now() + 3 * 60000)
        });

        // ENVÍO ASÍNCRONO (No bloqueante): Respondemos al usuario de inmediato
        sendSecurityCode(email, securityCode).catch(err => {
            console.error('⚠️ Fallo en envío de correo de registro (segundo plano):', err.message);
        });

        console.log(`✅ Registro pendiente creado para ${email}. Respondiendo al cliente.`);
        res.json({ msg: 'Código enviado al correo' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/resend-code
// @desc    Resend security code for pending registration
router.post('/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        const pending = await PendingRegistration.findOne({ where: { email } });

        if (!pending) {
            return res.status(400).json({ msg: 'No hay un registro pendiente para este correo.' });
        }

        const securityCode = Math.floor(100000 + Math.random() * 900000).toString();
        pending.code = securityCode;
        pending.codeExpiresAt = new Date(Date.now() + 3 * 60000);
        pending.attempts = 0; // reset attempts
        pending.lockUntil = null; // unlock
        await pending.save();

        sendSecurityCode(email, securityCode).catch(err => console.error(err));
        res.json({ msg: 'Nuevo código enviado al correo.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/verify
// @desc    Verify security code and CREATE user
router.post('/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        const pending = await PendingRegistration.findOne({ where: { email } });

        if (!pending) {
            return res.status(400).json({ msg: 'Registro no encontrado o expirado' });
        }

        if (pending.codeExpiresAt && pending.codeExpiresAt < new Date()) {
            return res.status(400).json({ msg: 'El código ha caducado (máximo 3 minutos). Por favor, genere un nuevo código.', expired: true });
        }

        if (pending.lockUntil && pending.lockUntil > new Date()) {
            const remainingMinutes = Math.ceil((pending.lockUntil - new Date()) / 60000);
            return res.status(403).json({ msg: `Límite de intentos superado. Por seguridad, espere ${remainingMinutes} minuto(s) e intente nuevamente.` });
        }

        if (pending.code !== code) {
            pending.attempts += 1;
            if (pending.attempts >= 3) {
                pending.lockUntil = new Date(Date.now() + 3 * 60 * 1000);
                pending.attempts = 0;
                await pending.save();
                return res.status(403).json({ msg: 'Ha ingresado un código incorrecto 3 veces seguidas. Por seguridad, el sistema se ha bloqueado por 3 minutos.' });
            }
            await pending.save();
            return res.status(400).json({ msg: `Código de verificación incorrecto. Le quedan ${3 - pending.attempts} intentos.` });
        }

        // Generate a cryptographically secure temporary password
        const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase() + '!@';

        // Generate Unique Code
        const uniqueCode = await generateUniqueCode(pending.initialForm);

        // CREATE the real user now
        try {
            await User.create({
                name: pending.name,
                email: pending.email,
                nationality: pending.nationality,
                initialForm: pending.initialForm,
                idNumber: pending.idNumber,
                uniqueCode,
                password: tempPassword,
                status: 'pending',
                mustChangePassword: true
            });
        } catch (dbErr) {
            if (dbErr.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ msg: 'Esta cédula o correo electrónico ya ha sido registrado por otro usuario.' });
            }
            throw dbErr;
        }

        // Send the TEMPORARY PASSWORD to the user
        await sendTemporaryPassword(pending.email, tempPassword);

        // Delete pending record
        await pending.destroy();

        res.json({ msg: 'Código verificado con éxito. Tu clave temporal ha sido enviada a tu correo.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route    GET api/auth/me
// @desc     Get current user
// @access   Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });
        
        let language = 'es';
        try {
            const store = require('../services/userLanguageStore');
            language = await store.getUserLanguage(user.id);
        } catch (lErr) {
            console.error('[ME] Error silencioso en idioma:', lErr.message);
        }

        const payload = user.get({ plain: true });
        payload.language = language;
        res.json(payload);
    } catch (err) {
        console.error('🔥 ERROR CRÍTICO EN /ME:', err);
        res.status(500).json({ 
            msg: 'Error interno al recuperar perfil', 
            error: err.message,
            stack: err.stack 
        });
    }
});

// @route    PATCH api/auth/me/language
// @desc     Update preferred language for the current user
// @access   Private
router.patch('/me/language', auth, async (req, res) => {
    try {
        const { language } = req.body || {};
        const userLanguageStore = require('../services/userLanguageStore');
        if (!userLanguageStore.SUPPORTED.includes(language)) {
            return res.status(400).json({ msg: 'Idioma inválido. Use "es" o "en".' });
        }
        const persisted = await userLanguageStore.setUserLanguage(req.user.id, language);
        return res.json({ msg: 'Idioma actualizado', language, persisted });
    } catch (err) {
        console.error('language update error:', err.message);
        return res.status(500).json({ msg: 'Error al actualizar idioma' });
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log(`🔐 Intento de login para: ${email}`);
        const user = await User.findOne({ where: { email } });
        
        if (!user) {
            console.log('❌ Usuario no encontrado en la base de datos.');
            return res.status(400).json({ msg: 'Credenciales inválidas' });
        }

        console.log(`👤 Usuario encontrado. Estado: ${user.status}, Rol: ${user.role}`);

        if (user.lockUntil && user.lockUntil > new Date()) {
            const remainingMinutes = Math.ceil((user.lockUntil - new Date()) / 60000);
            return res.status(403).json({ msg: `Tu cuenta está en suspenso por múltiples intentos fallidos. Por favor, espera ${remainingMinutes} minuto(s) para intentar de nuevo.` });
        }

        if (user.status === 'blocked') {
            // LLAVE MAESTRA: Si es el administrador y usa la clave correcta, lo desbloqueamos
            const isMasterMatch = await user.comparePassword(password);
            if (isMasterMatch && user.role === 'admin') {
                console.log('🔓 Desbloqueo de emergencia por Llave Maestra.');
                user.status = 'authorized';
                user.loginAttempts = 0;
                await user.save();
                // Continuamos al login normal
            } else {
                console.log('🚫 Usuario bloqueado.');
                return res.status(403).json({ msg: 'Tu cuenta ha sido bloqueada por demasiados intentos fallidos. Contacta al soporte.' });
            }
        }

        if (user.status !== 'authorized') {
            console.log(`⚠️ Usuario con estado: ${user.status}. No autorizado.`);
            return res.status(403).json({ msg: 'Cuenta no autorizada o pendiente de aprobación' });
        }

        const isMatch = await user.comparePassword(password);
        console.log(`🔑 Verificación de clave para ${email}: ${isMatch ? 'ÉXITO' : 'FALLIDO'}`);
        
        if (!isMatch) {
            user.loginAttempts += 1;
            console.log(`📉 Intento fallido #${user.loginAttempts}`);
            
            if (user.loginAttempts >= 3) {
                user.status = 'blocked';
                await user.save();
                return res.status(403).json({ msg: 'Cuenta bloqueada tras 3 intentos fallidos. Contacta al soporte.' });
            }
            
            await user.save();
            return res.status(400).json({ msg: `Credenciales inválidas. Intento ${user.loginAttempts} de 3.` });
        }

        // Reset attempts
        user.loginAttempts = 0;
        await user.save();

        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '8h' },
            async (err, token) => {
                if (err) {
                    console.error('❌ Error al firmar JWT:', err.message);
                    throw err;
                }
                
                user.activeToken = token;
                await user.save();
                console.log(`✅ Sesión iniciada para: ${email}`);

                res.json({ 
                    token, 
                    user: { 
                        id: user.id, 
                        name: user.name, 
                        email: user.email, 
                        role: user.role, 
                        mustChangePassword: user.mustChangePassword 
                    } 
                });
            }
        );
    } catch (err) {
        console.error('🔥 LOGIN CRITICAL ERROR:', err);
        res.status(500).json({ 
            msg: 'Error interno en el servidor durante el login', 
            error: err.message,
            stack: err.stack
        });
    }
});

// @route   PUT api/auth/update-profile
// @desc    Update user email and/or password
router.put('/update-profile', auth, async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        
        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: 'Sesión no válida o ID faltante' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ msg: 'Usuario no encontrado en la base de datos' });

        // Update email if provided
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
            if (existingUser) return res.status(400).json({ msg: 'El correo ya está en uso por otro usuario' });
            user.email = email;
        }

        // Update password if provided
        if (newPassword && newPassword.trim() !== '') {
            if (newPassword.length < 7) {
                return res.status(400).json({ msg: 'La contraseña debe tener al menos 7 caracteres' });
            }
            user.password = newPassword;
            user.mustChangePassword = false;
        }

        await user.save();

        await AuditLog.create({
            userId: user.id,
            action: 'PROFILE_UPDATE',
            description: `Usuario ${user.email} actualizó su perfil (técnico)`
        });

        res.json({ 
            msg: 'Perfil actualizado correctamente', 
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });
    } catch (err) {
        console.error('❌ CRITICAL PROFILE UPDATE ERROR:', err);
        res.status(500).json({ 
            msg: 'Error interno del servidor al actualizar perfil', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
        });
    }
});

// @route   POST api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const rawEmail = req.body.email || '';
        const email = rawEmail.toLowerCase().trim();
        console.log(`🔍 Solicitud de código de recuperación para: ${email}`);
        
        const user = await User.findOne({ 
            where: { email: { [Op.iLike]: email } }
        });
        
        if (!user) {
            return res.status(404).json({ msg: 'No se encontró ninguna cuenta registrada.' });
        }
        
        // DESBLOQUEO PROACTIVO: Si es admin, limpiamos su estado al momento de pedir el código
        if (user.role === 'admin') {
            console.log('🔓 Desbloqueo proactivo ejecutado para Administrador Maestro.');
            user.status = 'authorized';
            user.loginAttempts = 0;
        }

        // Generamos SOLO el código de 6 dígitos
        const securityCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.securityCode = securityCode;
        user.codeExpiresAt = new Date(Date.now() + 3 * 60000);
        
        // NO cambiamos password ni status aquí para evitar envíos dobles
        await user.save();
        
        console.log('📡 Enviando SOLAMENTE el código de seguridad...');
        const emailSent = await sendSecurityCode(email, securityCode);
        
        if (emailSent) {
            res.json({ msg: 'Código de seguridad enviado. Revise su bandeja de entrada.' });
        } else {
            res.status(500).json({ msg: 'Error al enviar el código. Intente más tarde.' });
        }
    } catch (err) {
        console.error('🔥 Error en forgot-password:', err.message);
        res.status(500).json({ msg: 'Error de servidor' });
    }
});

// @route   POST api/auth/verify-forgot-password
router.post('/verify-forgot-password', async (req, res) => {
    try {
        const { email, code } = req.body;
        const cleanEmail = email ? email.toLowerCase().trim() : '';
        const cleanCode = code ? code.toString().trim() : '';

        console.log(`🔐 Verificando código [${cleanCode}] para: ${cleanEmail}`);
        
        const user = await User.findOne({ 
            where: { email: { [Op.iLike]: cleanEmail } } 
        });
        
        if (!user) {
            return res.status(400).json({ msg: 'No se encontró ninguna cuenta registrada.' });
        }

        if (user.codeExpiresAt && user.codeExpiresAt < new Date()) {
            return res.status(400).json({ msg: 'El código ha caducado (máximo 3 minutos). Por favor, genere un nuevo código.', expired: true });
        }

        if (user.lockUntil && user.lockUntil > new Date()) {
            const remainingMinutes = Math.ceil((user.lockUntil - new Date()) / 60000);
            return res.status(403).json({ msg: `Límite de intentos superado. Por seguridad, espere ${remainingMinutes} minuto(s) e intente nuevamente.` });
        }

        if (user.securityCode !== cleanCode) {
            console.log('❌ Validación fallida: Código incorrecto.');
            user.codeAttempts += 1;
            if (user.codeAttempts >= 3) {
                user.lockUntil = new Date(Date.now() + 3 * 60 * 1000);
                user.codeAttempts = 0;
                await user.save();
                return res.status(403).json({ msg: 'Ha ingresado un código incorrecto 3 veces seguidas. Por seguridad, el sistema se ha bloqueado por 3 minutos.' });
            }
            await user.save();
            return res.status(400).json({ msg: `Código incorrecto o expirado. Le quedan ${3 - user.codeAttempts} intentos.` });
        }

        // PROTOCOLO DE RECUPERACIÓN TOTAL (Unblock + Reset)
        console.log('🔓 Iniciando Desbloqueo y Reseteo por validación de identidad...');
        const tempPassword = crypto.randomBytes(5).toString('hex').toUpperCase() + '@RECOV';
        
        user.password = tempPassword;
        user.securityCode = null; // Limpiar código usado
        user.status = 'authorized'; // DESBLOQUEO AUTOMÁTICO
        user.loginAttempts = 0; // RESET DE CONTADOR
        user.mustChangePassword = true;
        
        await user.save();

        const emailSent = await sendTemporaryPassword(email, tempPassword);
        
        if (emailSent !== false) {
            res.json({ msg: 'Código validado. Tu cuenta ha sido DESBLOQUEADA y se ha enviado una nueva clave a tu correo.' });
        } else {
            res.status(500).json({ msg: 'Código validado y cuenta desbloqueada, pero falló el envío del correo con la nueva clave. Contacta a soporte técnico.' });
        }
    } catch (err) {
        console.error('❌ ERROR CRÍTICO EN VERIFICACIÓN:', err);
        res.status(500).json({ msg: 'Error interno del servidor', error: err.message });
    }
});

module.exports = router;
