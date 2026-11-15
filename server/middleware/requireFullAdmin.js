'use strict';

/**
 * Exige un ADMINISTRADOR real: rol "admin" en la base de datos o perfil "master".
 * Los gerentes (manager) NO pasan. Usar después del middleware `auth`.
 */
async function isFullAdminRequest(req) {
    if (req.dbUser?.role === 'admin') return true;
    try {
        const profileStore = require('../services/userProfileStore');
        const profile = await profileStore.getProfile(req.user.id);
        return profile?.roleOverride === 'master';
    } catch (e) {
        console.warn('requireFullAdmin: no se pudo leer el perfil:', e.message);
        return false;
    }
}

async function requireFullAdmin(req, res, next) {
    if (await isFullAdminRequest(req)) return next();
    return res.status(403).json({ msg: 'Acceso denegado: solo el administrador puede realizar esta acción' });
}

module.exports = requireFullAdmin;
module.exports.isFullAdminRequest = isFullAdminRequest;
