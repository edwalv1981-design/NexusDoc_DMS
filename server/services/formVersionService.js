'use strict';

/**
 * Versionado de trámites (FormData).
 *
 * Cada guardado crea una fila NUEVA con data.__metadata = { parentId, version }.
 * Todas las versiones de un trámite comparten parentId = id de la versión 1
 * (la versión 1 tiene parentId null). Este servicio resuelve la "cadena" de
 * versiones, la versión más reciente, el diff entre versiones y los metadatos
 * que el SERVIDOR controla (no se aceptan desde el cliente):
 *   __metadata      { parentId, version, editedBy? }
 *   __adminEditLog  [{ at, version, adminId, adminName, adminEmail, changes }]
 *   __progress      { step, totalSteps, finished, savedAt }   (lo envía el formulario)
 */

const SERVER_KEYS = ['__metadata', '__adminEditLog', '__progress'];
const MAX_ADMIN_LOG = 50;

function getMeta(form) {
    const m = (form && form.data && form.data.__metadata) || {};
    return { parentId: m.parentId || null, version: Number(m.version) || 1, editedBy: m.editedBy || null };
}

function getRootId(form) {
    return getMeta(form).parentId || form.id;
}

/** Todas las versiones del trámite al que pertenece `form`, de la más antigua a la más reciente. */
async function getChain(form) {
    // Carga diferida: las funciones puras de este módulo se prueban sin base de datos.
    const { Op } = require('sequelize');
    const FormData = require('../models/FormData');
    const rootId = getRootId(form);
    const rows = await FormData.findAll({
        where: {
            userId: form.userId,
            [Op.or]: [{ id: rootId }, { 'data.__metadata.parentId': rootId }],
        },
    });
    if (!rows.some((r) => r.id === form.id)) rows.push(form);
    return rows.sort((a, b) => getMeta(a).version - getMeta(b).version || new Date(a.createdAt) - new Date(b.createdAt));
}

function pickLatest(rows) {
    return rows.length ? rows[rows.length - 1] : null;
}

async function getLatest(form) {
    return pickLatest(await getChain(form));
}

/** Quita del objeto enviado por el cliente las claves que solo controla el servidor. */
function stripServerKeys(data) {
    const clean = { ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}) };
    for (const k of SERVER_KEYS) delete clean[k];
    return clean;
}

/** Normaliza el progreso que envía el formulario (paso actual, total, finalizado). */
function sanitizeProgress(raw, previous) {
    const prev = previous && typeof previous === 'object' ? previous : {};
    if (!raw || typeof raw !== 'object') return Object.keys(prev).length ? prev : undefined;
    const total = Math.min(Math.max(parseInt(raw.totalSteps, 10) || 0, 1), 20);
    const step = Math.min(Math.max(parseInt(raw.step, 10) || 1, 1), total);
    return {
        step,
        totalSteps: total,
        // Una vez finalizado, sigue constando como finalizado.
        finished: raw.finished === true || prev.finished === true,
        savedAt: new Date().toISOString(),
    };
}

function getAdminEditLog(form) {
    const log = form && form.data && form.data.__adminEditLog;
    return Array.isArray(log) ? log : [];
}

// ── Diff legible para la bitácora ────────────────────────────────────────────
function short(v) {
    if (v === undefined || v === null || v === '') return '(vacío)';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function diffValues(before, after, path, out) {
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    const bothArrays = Array.isArray(before) && Array.isArray(after);
    const bothObjects = isPlainObject(before) && isPlainObject(after);
    if (bothArrays && before.every(isPlainObject) && after.every(isPlainObject)) {
        const len = Math.max(before.length, after.length);
        for (let i = 0; i < len; i++) {
            const p = `${path}#${i + 1}`;
            if (i >= before.length) out.push({ path: p, before: '(no existía)', after: 'agregado' });
            else if (i >= after.length) out.push({ path: p, before: 'existía', after: '(eliminado)' });
            else diffValues(before[i], after[i], p, out);
        }
        return;
    }
    if (bothObjects) {
        const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
        for (const k of keys) {
            if (k.startsWith('__') || k === '_id') continue;
            diffValues(before[k], after[k], path ? `${path}.${k}` : k, out);
        }
        return;
    }
    out.push({ path, before: short(before), after: short(after) });
}

/** Lista de cambios campo a campo entre dos objetos `data` (ignora metadatos). */
function computeChanges(oldData, newData) {
    const out = [];
    diffValues(stripServerKeys(oldData), stripServerKeys(newData), '', out);
    return out;
}

function describeChanges(changes, max = 40) {
    if (!changes.length) return 'Sin cambios';
    const lines = changes.slice(0, max).map((c) => `${c.path}: ${c.before} → ${c.after}`);
    if (changes.length > max) lines.push(`… y ${changes.length - max} cambio(s) más`);
    return lines.join('; ');
}

module.exports = {
    MAX_ADMIN_LOG,
    getMeta,
    getRootId,
    getChain,
    getLatest,
    pickLatest,
    stripServerKeys,
    sanitizeProgress,
    getAdminEditLog,
    computeChanges,
    describeChanges,
};
