'use strict';

const { sequelize } = require('../config/db');

const SUPPORTED = ['es', 'en'];
const DEFAULT_LANG = 'es';

/**
 * Resuelve el nombre real de la tabla users en el schema activo.
 * Cachea el resultado en memoria del proceso para evitar lookup repetido.
 *
 * Devuelve null si la tabla no existe o si el lookup falla.
 */
let cachedTableName = null;
let cachedTableLookupAttempted = false;
async function getUsersTableName() {
  if (cachedTableLookupAttempted) return cachedTableName;
  cachedTableLookupAttempted = true;
  try {
    const [rows] = await sequelize.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND lower(table_name) = 'users'
        ORDER BY table_name ASC
        LIMIT 1`
    );
    cachedTableName = rows && rows[0] && rows[0].table_name ? rows[0].table_name : null;
  } catch (_) {
    cachedTableName = null;
  }
  return cachedTableName;
}

function normalizeLang(value) {
  if (!value) return DEFAULT_LANG;
  const lower = String(value).toLowerCase().slice(0, 2);
  return SUPPORTED.includes(lower) ? lower : DEFAULT_LANG;
}

/**
 * Lee el idioma persistido de un usuario.
 *
 * Si la columna o tabla no existen (ej. ALTER TABLE no se ha aplicado en este
 * entorno), devuelve DEFAULT_LANG en lugar de propagar un error.
 */
async function getUserLanguage(userId) {
  if (!userId) return DEFAULT_LANG;
  try {
    const table = await getUsersTableName();
    if (!table) return DEFAULT_LANG;
    const quoted = `"${table.replace(/"/g, '""')}"`;
    const [rows] = await sequelize.query(
      `SELECT "language" FROM ${quoted} WHERE id = :id LIMIT 1`,
      { replacements: { id: userId } }
    );
    if (rows && rows[0] && rows[0].language) return normalizeLang(rows[0].language);
    return DEFAULT_LANG;
  } catch (_) {
    return DEFAULT_LANG;
  }
}

/**
 * Persiste el idioma elegido. Devuelve un booleano de éxito.
 *
 * Si la columna no existe, devuelve false sin lanzar. El llamador puede
 * informar 200 con `{ persisted: false }` o decidir su política.
 */
async function setUserLanguage(userId, language) {
  if (!userId) return false;
  const lang = normalizeLang(language);
  try {
    const table = await getUsersTableName();
    if (!table) return false;
    const quoted = `"${table.replace(/"/g, '""')}"`;
    await sequelize.query(
      `UPDATE ${quoted} SET "language" = :lang WHERE id = :id`,
      { replacements: { lang, id: userId } }
    );
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  SUPPORTED,
  DEFAULT_LANG,
  normalizeLang,
  getUserLanguage,
  setUserLanguage,
};
