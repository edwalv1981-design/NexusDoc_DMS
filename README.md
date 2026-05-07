# NexusDoc DMS - Variables de Entorno

Esta guía deja documentadas las variables para despliegue en Railway y para entorno local.

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

## Valores sugeridos para Railway

- `CORS_ORIGINS=https://nexusdocdms-production.up.railway.app,http://localhost:5173`
- `DB_SYNC_ALTER=false` (subir a `true` solo de forma temporal si necesitas sincronizar esquema)

## Seguridad básica

- Nunca subas `.env` al repositorio.
- Rota cualquier key expuesta (como ya hiciste con Resend).
- Si cambias `JWT_SECRET`, todas las sesiones actuales se invalidarán.
