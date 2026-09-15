'use strict';

/**
 * Resolución defensiva de tablas PostgreSQL (Users vs users, AuditLogs vs audit_logs).
 * Sequelize suele citar PascalCase; migraciones y search_path pueden dejar snake_case.
 */

function quoteIdent(name) {
    if (!name || typeof name !== 'string') {
        throw new Error('Identificador SQL inválido');
    }
    return `"${name.replace(/"/g, '""')}"`;
}

/**
 * @param {import('sequelize').Sequelize} sequelize
 * @param {string[]} candidates
 * @returns {Promise<string|null>} nombre físico sin comillas
 */
async function findPhysicalTableName(sequelize, candidates) {
    const names = [...new Set((candidates || []).map((c) => String(c).toLowerCase()).filter(Boolean))];
    if (!names.length) return null;
    const QueryTypes = sequelize.QueryTypes || require('sequelize').QueryTypes;
    const rows = await sequelize.query(
        `SELECT table_name
           FROM information_schema.tables
          WHERE table_schema = current_schema()
            AND lower(table_name) IN (:names)
          ORDER BY table_name
          LIMIT 1`,
        { replacements: { names }, type: QueryTypes.SELECT }
    );
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row && row.table_name ? String(row.table_name) : null;
}

async function quotePhysicalTable(sequelize, candidates) {
    const tableName = await findPhysicalTableName(sequelize, candidates);
    return tableName ? quoteIdent(tableName) : null;
}

function asPlain(row) {
    if (!row) return row;
    if (typeof row.get === 'function') return row.get({ plain: true });
    if (typeof row.toJSON === 'function') return row.toJSON();
    return { ...row };
}

function normalizeUserListRow(raw) {
    const u = asPlain(raw) || {};
    const uniqueCode = u.uniqueCode || u.unique_code || '—';
    const idNumber = u.idNumber || u.id_number || '';
    const createdAt = u.createdAt || u.created_at || null;
    return {
        ...u,
        uniqueCode,
        idNumber,
        createdAt,
        status: u.status || 'pending',
        role: u.role || 'client',
    };
}

function normalizeAuditLogRow(raw) {
    const log = asPlain(raw) || {};
    const nested = log.User || log.user || null;
    const userPlain = nested ? asPlain(nested) : null;
    const createdAt = log.createdAt || log.created_at || null;
    const userName = userPlain?.name || log.userName || log.user_name || null;
    return {
        ...log,
        createdAt,
        User: userPlain || (userName ? { name: userName } : null),
        user: userPlain || (userName ? { name: userName } : null),
    };
}

function normalizeTemplateRow(raw) {
    const t = asPlain(raw) || {};
    let name = t.name;
    if (name === 'referencia_maestra') name = 'fondos';
    return {
        id: t.id,
        name,
        updatedAt: t.updatedAt || t.updated_at || null,
    };
}

module.exports = {
    quoteIdent,
    findPhysicalTableName,
    quotePhysicalTable,
    asPlain,
    normalizeUserListRow,
    normalizeAuditLogRow,
    normalizeTemplateRow,
};
