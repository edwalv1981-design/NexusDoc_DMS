'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  quoteIdent,
  normalizeUserListRow,
  normalizeAuditLogRow,
  normalizeTemplateRow,
} = require('../utils/pgTable');

describe('pgTable / admin list normalizers', () => {
  it('quoteIdent cita identificadores PostgreSQL', () => {
    assert.equal(quoteIdent('Users'), '"Users"');
    assert.equal(quoteIdent('audit_logs'), '"audit_logs"');
    assert.equal(quoteIdent('weird"name'), '"weird""name"');
  });

  it('normalizeUserListRow unifica snake_case y camelCase', () => {
    const row = normalizeUserListRow({
      id: '1',
      name: 'Ana',
      unique_code: 'C001',
      id_number: '8-1',
      created_at: '2026-01-01',
      status: null,
    });
    assert.equal(row.uniqueCode, 'C001');
    assert.equal(row.idNumber, '8-1');
    assert.equal(row.createdAt, '2026-01-01');
    assert.equal(row.status, 'pending');
  });

  it('normalizeAuditLogRow expone User y createdAt', () => {
    const row = normalizeAuditLogRow({
      id: 9,
      action: 'LOGIN',
      description: 'ok',
      created_at: '2026-02-02',
      user: { name: 'Master' },
    });
    assert.equal(row.createdAt, '2026-02-02');
    assert.equal(row.User.name, 'Master');
    assert.equal(row.user.name, 'Master');
  });

  it('normalizeTemplateRow renombra referencia_maestra', () => {
    const row = normalizeTemplateRow({ id: 'a', name: 'referencia_maestra', updated_at: 'x' });
    assert.equal(row.name, 'fondos');
    assert.equal(row.updatedAt, 'x');
  });
});
