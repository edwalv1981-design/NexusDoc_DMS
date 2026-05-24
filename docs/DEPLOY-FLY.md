# Despliegue en Fly.io — NexusDoc DMS

## Causa de los fallos típicos

| Síntoma en logs | Causa |
|-----------------|--------|
| `connect ECONNREFUSED 127.0.0.1:5432` | No existe `DATABASE_URL` en secrets. Sequelize caía al modo “local” (`localhost:5432`). |
| `[migrate] db:migrate falló (código 1)` | Misma razón: migraciones sin URL de Postgres (p. ej. Supabase). |
| `Is your app listening on 0.0.0.0:3030?` | `fly.toml` tenía `internal_port = 3030` pero la app escucha `PORT` (8080 en producción). |
| `instance refused connection` | Health check al puerto equivocado o el proceso murió antes de `listen`. |

El servidor hace **listen primero** en `0.0.0.0` y responde `/health` aunque la BD falle después (comportamiento desde `682ea67`). La API completa y las migraciones **sí** requieren `DATABASE_URL`.

## Secrets obligatorios (antes del deploy)

Sustituye los valores de ejemplo por los reales (Supabase → Connection string → URI, modo *Session* o *Transaction* según tu pooler).

```bash
fly secrets set \
  DATABASE_URL="postgres://USER:PASS@HOST:5432/postgres?sslmode=require" \
  JWT_SECRET="tu-secreto-largo-aleatorio" \
  NODE_ENV="production" \
  CORS_ORIGINS="https://nexusdoc-dms.fly.dev,https://tu-dominio.com" \
  -a nexusdoc-dms
```

Opcionales (bootstrap de admin, email, etc.): ver `server/.env.example` y `README.md`.

Comprobar secrets:

```bash
fly secrets list -a nexusdoc-dms
```

## Desplegar

Desde la raíz del repo (con `fly.toml` y `Dockerfile`):

```bash
fly deploy -a nexusdoc-dms
```

Tras el deploy:

```bash
fly logs -a nexusdoc-dms
curl -s https://nexusdoc-dms.fly.dev/health
```

Debes ver algo como `OK - Servidor Vivo` y en logs:

```text
[start] ... PORT=8080 DATABASE_URL=set JWT_SECRET=set
🚀 SERVIDOR WEB ACTIVO EN PUERTO: 8080 (health + SPA inmediato)
```

## Puertos y health checks

- `fly.toml` → `internal_port = 8080`, comprobación HTTP en `/health`.
- La app usa `process.env.PORT` (Fly inyecta `8080`) y escucha en **`0.0.0.0`**.
- No uses `3030` en `fly.toml` salvo que cambies también `PORT` y el `Dockerfile`.

## Base de datos

- Producción: **solo** `DATABASE_URL` (Postgres gestionado, p. ej. Supabase con SSL).
- En producción **no** hay fallback a `localhost`; sin URL verás un error explícito en logs, pero `/health` puede seguir respondiendo.

## Redeploy tras cambiar secrets

Los secrets no se aplican a máquinas ya corriendo hasta un nuevo deploy:

```bash
fly secrets set DATABASE_URL="..." -a nexusdoc-dms
fly deploy -a nexusdoc-dms
```

## Railway vs Fly

Railway usa `railway.toml` y el mismo `Dockerfile`. Fly usa este `fly.toml`. Puedes mantener ambos; cada plataforma ignora la config de la otra.
