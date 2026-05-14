'use strict';

const { sequelize } = require('../config/db');

const SUPPORTED = ['es', 'en'];
const DEFAULT_LANG = 'es';

/**
 * Servicio de Idioma Blindado contra Dependencias Circulares.
 * No importa '../models' para evitar bloqueos de inicialización.
 */

function normalizeLang(value) {
  if (!value) return DEFAULT_LANG;
  const lower = String(value).toLowerCase().slice(0, 2);
  return SUPPORTED.includes(lower) ? lower : DEFAULT_LANG;
}

/**
 * Obtiene el nombre de la tabla de forma segura sin cargar el archivo de modelos.
 */
function getActualTableName() {
  try {
    // Acceso directo al registro de modelos de Sequelize
    const UserModel = sequelize.models.User;
    if (UserModel) {
      const raw = UserModel.getTableName();
      return typeof raw === 'object' ? raw.tableName : raw;
    }
    return 'users';
  } catch (e) {
    return 'users';
  }
}

async function getUserLanguage(userId) {
  if (!userId) return DEFAULT_LANG;
  try {
    const tableName = getActualTableName();
    const quoted = `"${tableName.replace(/"/g, '""')}"`;
    
    const [rows] = await sequelize.query(
      `SELECT "language" FROM ${quoted} WHERE id = :id LIMIT 1`,
      { 
        replacements: { id: userId }, 
        type: sequelize.QueryTypes.SELECT 
      }
    ).catch(() => [{ language: DEFAULT_LANG }]);
    
    if (rows && rows.language) {
      return normalizeLang(rows.language);
    }
    
    return DEFAULT_LANG;
  } catch (err) {
    console.error('[LanguageStore] Fallo en getUserLanguage:', err.message);
    return DEFAULT_LANG;
  }
}

async function setUserLanguage(userId, language) {
  if (!userId) return false;
  const lang = normalizeLang(language);
  try {
    const tableName = getActualTableName();
    const quoted = `"${tableName.replace(/"/g, '""')}"`;
    
    await sequelize.query(
      `UPDATE ${quoted} SET "language" = :lang WHERE id = :id`,
      { replacements: { lang, id: userId } }
    ).catch((e) => {
        console.error('[LanguageStore] Error en UPDATE language:', e.message);
    });
    
    return true;
  } catch (err) {
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
