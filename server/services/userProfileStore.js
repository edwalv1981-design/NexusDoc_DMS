const { sequelize } = require('../config/db');

async function getProfile(userId) {
    try {
        const [results] = await sequelize.query(`SELECT "roleOverride", "phone", "address", "createdBy" FROM "UserProfiles" WHERE "userId" = :userId`, {
            replacements: { userId }
        });
        if (results.length > 0) return results[0];
        return null;
    } catch (err) {
        console.warn('⚠️ getProfile falló:', err.message);
        return null;
    }
}

async function setProfile(userId, data) {
    try {
        const existing = await getProfile(userId);
        if (existing) {
            await sequelize.query(
                `UPDATE "UserProfiles" SET "roleOverride" = :roleOverride, "phone" = :phone, "address" = :address, "createdBy" = :createdBy WHERE "userId" = :userId`,
                { replacements: { userId, ...data } }
            );
        } else {
            await sequelize.query(
                `INSERT INTO "UserProfiles" ("userId", "roleOverride", "phone", "address", "createdBy") VALUES (:userId, :roleOverride, :phone, :address, :createdBy)`,
                { replacements: { userId, ...data } }
            );
        }
    } catch (err) {
        console.warn('⚠️ setProfile falló:', err.message);
    }
}

module.exports = {
    getProfile,
    setProfile
};
