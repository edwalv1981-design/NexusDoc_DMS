'use strict';
/**
 * E2E (solo base de datos temporal de CI): crea un administrador, un gerente y
 * un cliente con contraseñas conocidas. Nunca ejecutar contra producción.
 */
const path = require('path');
process.chdir(path.join(__dirname, '../..'));
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) {
  console.error('seed.cjs: solo se permite contra una base de datos local de CI.');
  process.exit(1);
}
const { connectDB } = require('../../config/db');
const User = require('../../models/User');
const profileStore = require('../../services/userProfileStore');

(async () => {
  await connectDB();
  // Igual que ensureUserProfilesTable() del servidor (en la BD temporal el bootstrap
  // puede no llegar a crearla).
  const { sequelize } = require('../../config/db');
  await sequelize.query(`CREATE TABLE IF NOT EXISTS "UserProfiles" ("userId" UUID PRIMARY KEY, "roleOverride" VARCHAR(50), "phone" VARCHAR(50), "address" TEXT, "createdBy" UUID)`);
  const pass = process.env.E2E_PASSWORD;
  const mk = (name, email, role, idNumber, uniqueCode) => User.create({
    name, email, password: pass, role, status: 'authorized', nationality: 'Ecuador',
    idNumber, uniqueCode, mustChangePassword: false,
  });
  await mk('Admin E2E', 'admin.e2e@example.com', 'admin', '0900000001', 'E2E-ADMIN');
  const manager = await mk('Gerente E2E', 'manager.e2e@example.com', 'client', '0900000002', 'E2E-MGR');
  await profileStore.setProfile(manager.id, { roleOverride: 'manager' });
  await mk('Cliente E2E', 'client.e2e@example.com', 'client', '0900000003', 'E2E-CLI');
  // Subusuario creado por el "Administrador Usuarios" (igual que /api/manager/sub-users).
  const sub = await mk('Subusuario E2E', 'sub.e2e@example.com', 'client', '0900000004', 'E2E-SUB');
  await profileStore.setProfile(sub.id, { roleOverride: 'client', createdBy: manager.id });
  console.log('seed ok');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  const detail = [e.message, ...(e.errors || []).map((x) => x.message)].join(' | ');
  console.log(`::error title=seed::${String(detail).replace(/\r?\n/g, ' ')}`);
  process.exit(1);
});
