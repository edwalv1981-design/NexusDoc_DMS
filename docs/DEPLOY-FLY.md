# Despliegue en Fly.io — NexusDoc DMS

## Causa de los fallos típicos

| Síntoma en logs | Causa |
|-----------------|--------|
| `connect ECONNREFUSED 127.0.0.1:5432` | No existe `DATABASE_URL` en secrets. Sequelize caía al modo “local” (`localhost:5432`). |
| `[migrate] db:migrate falló (código 1)` | Misma razón: migraciones sin URL de Postgres (p. ej. Supabase). |
| `Is your app listening on 0.0.0.0:3030?` | `fly.toml` tenía `internal_port = 3030` pero la app escucha `PORT` (8080 en producción). |
| `instance refused connection` | Health check al puerto equivocado o el proceso murió antes de `listen`. |
| **HTTP 500** en `/` o `/dashboard` | Imagen sin `client/dist` (build falló) o middleware SPA roto (commit `b729d11` lo corrige). También `sendFile` sin callback devolvía 500 si fallaba la ruta. |
| **HTTP 503** en `/dashboard` | `client/dist/index.html` no existe en el contenedor — revisar paso `npm run build` del `Dockerfile`. |
| `The server does not support SSL connections` | `DATABASE_URL` apunta a Postgres local sin SSL pero Sequelize forzaba SSL. Usar `?sslmode=require` en Supabase o `DB_SSL=false` solo en local. |

El servidor hace **listen primero** en `0.0.0.0` y responde `/health` aunque la BD falle después (comportamiento desde `682ea67`). La API completa y las migraciones **sí** requieren `DATABASE_URL`. **`/health` y el SPA no dependen de la BD.**

## HTTP 500 en `/dashboard` — causa y corrección

**Causa:** Tras configurar secrets, la app arrancaba (502 → 500) pero el frontend no se servía bien: el handler de errores estaba *antes* de las rutas API/SPA, `express.static` se montaba aunque faltara `dist`, y `/` no devolvía `index.html`.

**Corrección (commit `b729d11`):**

- SPA y estáticos registrados **antes** del error handler.
- `/` y `/dashboard` sirven `client/dist/index.html` cuando existe el build.
- `Dockerfile` verifica `test -f dist/index.html` tras el build.
- `.dockerignore` excluye `client/dist` local (el build ocurre dentro de la imagen).
- SSL condicional en `server/config/db.js` para Supabase.

**Importante:** Cambiar secrets **no** redeploya solo. Después de `fly secrets set` hay que ejecutar `fly deploy`.

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

### Supabase / SSL

Use la URI de Supabase con `?sslmode=require` (Session pooler, puerto 5432, o Transaction pooler 6543):

```text
postgres://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require
```

Si las migraciones fallan por SSL, confirme que `DATABASE_URL` incluye `sslmode=require`. Para depuración local contra Postgres sin SSL: `DB_SSL=false` (no usar en Fly).

## Redeploy tras cambiar secrets

Los secrets no se aplican a máquinas ya corriendo hasta un nuevo deploy:

```bash
fly secrets set DATABASE_URL="..." -a nexusdoc-dms
fly deploy -a nexusdoc-dms
```

## Verificación post-deploy (orden recomendado)

1. **Probar `/health` primero** (despierta la máquina si `auto_stop_machines` está activo):

   ```bash
   curl -s https://nexusdoc-dms.fly.dev/health
   ```

   Esperado: `OK - Servidor Vivo`

2. **SPA:**

   ```bash
   curl -sI https://nexusdoc-dms.fly.dev/dashboard | findstr /I "HTTP content-type"
   ```

   Esperado: `HTTP/2 200` y `content-type: text/html`

3. **Logs (stack trace si hay 500):**

   ```bash
   fly logs -a nexusdoc-dms
   ```

   Buscar: `[static] distPath=... index.html=ok`, `[spa] sendFile error`, `ERROR NO CONTROLADO`.

4. **Smoke local antes de deploy:**

   ```bash
   cd client && npm run build
   cd ../server
   set NODE_ENV=production
   set JWT_SECRET=test
   node index.js
   ```

   En otra terminal: `curl http://127.0.0.1:8080/health` y `curl -I http://127.0.0.1:8080/dashboard`

## Railway vs Fly

Railway usa `railway.toml` y el mismo `Dockerfile`. Fly usa este `fly.toml`. Puedes mantener ambos; cada plataforma ignora la config de la otra.
