'use strict';

/**
 * Helpers for POST /api/auth/login — map DB/setup failures vs invalid credentials.
 */

function normalizeLoginEmail(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.trim().toLowerCase();
}

function errorMessage(err) {
    if (!err) return '';
    return String(err.message || err.parent?.message || err.original?.message || err);
}

function isMissingUsersTableError(err) {
    const msg = errorMessage(err).toLowerCase();
    return (
        (msg.includes('relation') && msg.includes('does not exist') && msg.includes('user')) ||
        (msg.includes('no existe la relación') && msg.includes('user'))
    );
}

function isDatabaseConnectivityError(err) {
    const name = err && err.name;
    const msg = errorMessage(err).toLowerCase();
    const connectivityNames = new Set([
        'SequelizeConnectionError',
        'SequelizeConnectionRefusedError',
        'SequelizeHostNotFoundError',
        'SequelizeAccessDeniedError',
        'SequelizeConnectionTimedOutError',
    ]);
    if (connectivityNames.has(name)) return true;
    return (
        msg.includes('econnrefused') ||
        msg.includes('etimedout') ||
        msg.includes('enotfound') ||
        msg.includes('password authentication failed') ||
        msg.includes('the server does not support ssl connections') ||
        msg.includes('self signed certificate')
    );
}

/**
 * @returns {{ status: number, msg: string } | null} null = unexpected server error (500)
 */
function mapLoginInfrastructureError(err) {
    const msg = errorMessage(err).toLowerCase();

    if (isMissingUsersTableError(err)) {
        return {
            status: 503,
            msg: 'La base de datos aún no tiene el esquema de usuarios. Ejecute migraciones (npm run db:migrate) contra Supabase y redespliegue.',
        };
    }
    if (isDatabaseConnectivityError(err)) {
        if (msg.includes('password authentication failed')) {
            return {
                status: 503,
                msg: 'No se pudo autenticar en PostgreSQL. En fly secrets use el Session pooler (puerto 5432), usuario postgres.PROJECT_REF (no solo "postgres"), contraseña del dashboard URL-encoded y ?sslmode=require.',
            };
        }
        if (msg.includes('self signed certificate') || msg.includes('self-signed certificate')) {
            return {
                status: 503,
                msg: 'Error SSL con Supabase. Actualice DATABASE_URL con ?sslmode=require (la app añade uselibpqcompat) o redespliegue tras corregir fly secrets.',
            };
        }
        return {
            status: 503,
            msg: 'No se pudo conectar a la base de datos. Verifique DATABASE_URL (Supabase Session pooler, puerto 5432) y SSL.',
        };
    }
    return null;
}

module.exports = {
    normalizeLoginEmail,
    mapLoginInfrastructureError,
    isMissingUsersTableError,
    isDatabaseConnectivityError,
};
