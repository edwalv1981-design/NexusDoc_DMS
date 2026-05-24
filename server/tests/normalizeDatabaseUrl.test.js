'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { prepareDatabaseUrlForPg } = require('../config/normalizeDatabaseUrl');

describe('prepareDatabaseUrlForPg', () => {
    it('añade uselibpqcompat cuando hay sslmode=require', () => {
        const raw =
            'postgres://postgres.ref:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require';
        const out = prepareDatabaseUrlForPg(raw);
        const u = new URL(out);
        assert.equal(u.searchParams.get('sslmode'), 'require');
        assert.equal(u.searchParams.get('uselibpqcompat'), 'true');
    });

    it('no duplica uselibpqcompat si ya existe', () => {
        const raw =
            'postgres://u:p@host:6543/postgres?sslmode=require&uselibpqcompat=true';
        const out = prepareDatabaseUrlForPg(raw);
        assert.equal(out.split('uselibpqcompat=').length - 1, 1);
    });
});
