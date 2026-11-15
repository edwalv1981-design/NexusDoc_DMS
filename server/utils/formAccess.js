'use strict';

/**
 * Alcance de acceso a trámites según el tipo de cuenta (Opción A):
 *   - Administrador (admin / master): todo el sistema.
 *   - Administrador Usuarios (roleOverride "manager"): sus propios trámites y
 *     los de los subusuarios que él creó (UserProfiles.createdBy).
 *   - Usuario normal: solo sus propios trámites.
 */
const profileStore = require('../services/userProfileStore');

function isFullAdmin(req) {
    // En el JWT las cuentas master llevan role "admin" (ver login).
    return req.dbUser?.role === 'admin' || req.user?.role === 'admin';
}

async function isManager(req) {
    try {
        const profile = await profileStore.getProfile(req.user.id);
        return profile?.roleOverride === 'manager';
    } catch {
        return false;
    }
}

async function getSubUserIds(managerId) {
    const { sequelize } = require('../config/db');
    const [rows] = await sequelize.query('SELECT "userId" FROM "UserProfiles" WHERE "createdBy" = :managerId', {
        replacements: { managerId },
    });
    return (rows || []).map((r) => r.userId).filter(Boolean);
}

/** null = sin restricción (administrador); si no, lista de userId permitidos. */
async function accessibleUserIds(req) {
    if (isFullAdmin(req)) return null;
    const ids = [req.user.id];
    if (await isManager(req)) {
        try {
            ids.push(...(await getSubUserIds(req.user.id)));
        } catch (e) {
            console.warn('formAccess: no se pudieron leer los subusuarios:', e.message);
        }
    }
    return [...new Set(ids)];
}

async function canAccessForm(req, form) {
    if (!form) return false;
    if (form.userId === req.user.id) return true;
    const ids = await accessibleUserIds(req);
    return ids === null || ids.includes(form.userId);
}

module.exports = { isFullAdmin, isManager, getSubUserIds, accessibleUserIds, canAccessForm };
