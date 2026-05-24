'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    normalizeLoginEmail,
    mapLoginInfrastructureError,
    isMissingUsersTableError,
} = require('../utils/loginAuth');

describe('loginAuth helpers', () => {
    it('normalizeLoginEmail recorta y pasa a minúsculas', () => {
        assert.equal(normalizeLoginEmail('  Ed@Example.COM '), 'ed@example.com');
        assert.equal(normalizeLoginEmail(''), '');
    });

    it('detecta tabla users inexistente', () => {
        const err = new Error('relation "Users" does not exist');
        assert.equal(isMissingUsersTableError(err), true);
        const mapped = mapLoginInfrastructureError(err);
        assert.equal(mapped.status, 503);
        assert.match(mapped.msg, /migraciones/i);
    });

    it('mapea errores de conexión SSL', () => {
        const err = new Error('The server does not support SSL connections');
        err.name = 'SequelizeConnectionError';
        const mapped = mapLoginInfrastructureError(err);
        assert.equal(mapped.status, 503);
    });

    it('devuelve null para errores no de infraestructura', () => {
        assert.equal(mapLoginInfrastructureError(new Error('unexpected bug')), null);
    });
});
