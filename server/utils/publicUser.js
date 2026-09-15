'use strict';

const PUBLIC_USER_FIELDS = [
    'id',
    'name',
    'email',
    'role',
    'status',
    'nationality',
    'idNumber',
    'uniqueCode',
    'mustChangePassword',
    'createdAt',
    'updatedAt',
    'roleOverride',
    'language',
    'remainingDays',
];

function toPlain(user) {
    if (!user) return null;
    if (typeof user.get === 'function') return user.get({ plain: true });
    return { ...user };
}

function publicUser(user, extra = {}) {
    const plain = toPlain(user) || {};
    const out = {};
    for (const key of PUBLIC_USER_FIELDS) {
        if (plain[key] !== undefined) out[key] = plain[key];
    }
    delete out.password;
    delete out.securityCode;
    delete out.activeToken;
    delete out.codeExpiresAt;
    delete out.codeAttempts;
    delete out.lockUntil;
    delete out.loginAttempts;
    return { ...out, ...extra };
}

module.exports = { publicUser, PUBLIC_USER_FIELDS };
