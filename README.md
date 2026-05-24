# NexusDoc DMS - Variables de Entorno

Esta guía deja documentadas las variables para despliegue en Railway y para entorno local.

**Post-deploy:** tras cada deploy en Railway, ejecuta el [checklist automático de smoke](docs/DEPLOY-CHECKLIST.md) (`npm run check:deploy:prod`).

## Backend (`server`)

Configura estas variables en Railway (servicio `NexusDoc_DMS`) o en `server/.env` local.

- `NODE_ENV` (recomendada): `production` en nube, `development` en local.
- `JWT_SECRET` (obligatoria): secreto largo y aleatorio para firmar/verificar tokens.
- `DATABASE_URL` (obligatoria en producción): URL completa de PostgreSQL.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` (local): usadas solo si no existe `DATABASE_URL`.
- `CORS_ORIGINS` (obligatoria): lista separada por coma de dominios frontend permitidos.
- `DB_SYNC_ALTER` (recomendada): `false` en producción, `true` solo temporalmente para recuperación/mantenimiento.
- `BOOTSTRAP_ADMIN_EMAIL` (opcional): crea/sincroniza admin en arranque si también existe password.
- `BOOTSTRAP_ADMIN_PASSWORD` (opcional): contraseña inicial del admin bootstrap.
- `BOOTSTRAP_ADMIN_NAME` (opcional): nombre del admin bootstrap.
- `RESEND_API_KEY` (obligatoria si hay envío de correos): API key activa de Resend.
- `SENDER_EMAIL` (obligatoria si hay envío de correos): remitente verificado en Resend.

Variables legacy presentes en Railway pero no usadas actualmente por el código:

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`

## Frontend (`client`)

La app actualmente resuelve API de forma dinámica en `client/src/config.js`:

- en local usa `http://localhost:5000`
- en producción usa ruta relativa del mismo dominio

`VITE_API_URL` puede existir en Railway, pero hoy no es requerida por el código actual.

## URL pública (Railway)

Dominio correcto del servicio en producción (con **doc** en el nombre):

- **https://nexusdocdms-production.up.railway.app**

No uses `nexusducms-production` (falta la **o** de *doc*); ese hostname no corresponde a este proyecto y puede devolver 502 o error de DNS.

Variable opcional para documentación / enlaces en correos:

- `PUBLIC_DOMAIN=nexusdocdms-production.up.railway.app` (sin `https://`)

## Valores sugeridos para Railway

- `CORS_ORIGINS=https://nexusdocdms-production.up.railway.app,http://localhost:5173`
- `DB_SYNC_ALTER=false` (subir a `true` solo de forma temporal si necesitas sincronizar esquema)

## Migraciones (sequelize-cli)

El proyecto usa migraciones para cambios de esquema sin depender de `sequelize.sync`.

- Ejecutar migraciones manualmente: `cd server && npm run db:migrate`
- Si `DATABASE_URL` está en `server/.env` (Supabase Session pooler, puerto **6543**), `db:migrate` la usa aunque `NODE_ENV` no sea `production`.
- Producción / Fly (fuerza `NODE_ENV=production`): `cd server && npm run db:migrate:prod`
- Ver estado de migraciones: `cd server && npm run db:migrate:status`

**PowerShell (Windows):** la variable debe existir en el **mismo proceso** que ejecuta npm. Opción A: poner `DATABASE_URL` en `server/.env`. Opción B: en **una sola línea** (comillas simples `'...'` si la contraseña tiene `$`, `!`, `#`, etc.):

```powershell
cd C:\ruta\NexusDoc_DMS\server; $env:DATABASE_URL='postgres://postgres.PROJECT_REF:SU_CONTRASEÑA@aws-1-us-east-1.pooler.supabase.co:6543/postgres?sslmode=require'; npm run db:migrate
```
- Revertir la ultima migracion: `cd server && npm run db:migrate:undo`
- Crear administrador en Supabase (env `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD`): `cd server && npm run bootstrap:admin` (alias `npm run seed:admin` / `npm run create-admin`)

En despliegue (Railway/Docker), el arranque usa `server/scripts/start-with-migrate.sh` (definido en `Dockerfile`, `railway.toml` y `server` → `npm start`). El servidor hace **listen en `PORT` de inmediato** (`/` y `/health` responden antes del bootstrap). Las migraciones Sequelize se intentan al inicio; si fallan, el API arranca igualmente (revisar logs). Desarrollo local sin migrate: `cd server && npm run start:dev`.

### Logs esperados en un deploy correcto

```
[start] NODE_ENV=production
[start] Running Sequelize migrations (production)...
[start] Starting server...
[start] NexusDoc API NODE_ENV=production PORT=8080 DATABASE_URL=set JWT_SECRET=set
🚀 SERVIDOR WEB ACTIVO EN PUERTO: 8080 (health + bootstrap en segundo plano)
💎 Bootstrap completado.
```

Si ves solo `server@1.0.0 start` → `node index.js` sin `start-with-migrate.sh`, Railway no está usando el `Dockerfile`/`railway.toml` actual: haz redeploy desde `main` o fija **Builder = Dockerfile** en el servicio.

## Seguridad básica

- Nunca subas `.env` al repositorio.
- Rota cualquier key expuesta (como ya hiciste con Resend).
- Si cambias `JWT_SECRET`, todas las sesiones actuales se invalidarán.
