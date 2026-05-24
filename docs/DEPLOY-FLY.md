# Despliegue en Fly.io — NexusDoc DMS



## Causa de los fallos típicos



| Síntoma en logs | Causa |

|-----------------|--------|

| `injecting env (8) from .env` en producción | Un `.env` dentro de la imagen Docker **sobrescribe** `fly secrets` (p. ej. `DATABASE_URL` local, `PORT=3000`). La app ya **no** carga `.env` si `NODE_ENV=production` o `FLY_APP_NAME` está definido; `.dockerignore` excluye `.env` / `.env.local`. |

| `connect ECONNREFUSED` a IPv6 (`2800:…:5432`) | `DATABASE_URL` usa Supabase **Direct** (IPv6). Fly necesita el **Session pooler** (IPv4, puerto **6543**). |

| `connect ECONNREFUSED 127.0.0.1:5432` | No existe `DATABASE_URL` en secrets. Sequelize caía al modo “local” (`localhost:5432`). |

| `[migrate] db:migrate falló (código 1)` | Misma razón: migraciones sin URL de Postgres (p. ej. Supabase pooler). |

| `PORT=3000` en logs pero `internal_port = 8080` | `.env` en imagen o secret obsoleto fijaba `PORT=3000`. Fly inyecta `PORT` = `internal_port` (8080); deben coincidir. |

| `instance refused connection` en `0.0.0.0:3000` | Proxy Fly al 8080 pero la app escuchaba 3000. Tras el fix, logs deben mostrar puerto **8080**. |

| Proxy / health checks en `0.0.0.0:3030` | `fly launch` antiguo dejó `internal_port = 3030` en Fly aunque el repo usa **8080**. La app escucha 8080 pero el proxy apunta a 3030 → conexión rechazada. |

| **HTTP 500** en `/` o `/dashboard` | Imagen sin `client/dist` (build falló) o middleware SPA roto. |

| **HTTP 503** en `/dashboard` | `client/dist/index.html` no existe en el contenedor — revisar paso `npm run build` del `Dockerfile`. |

| **HTTP 500** en `POST /api/auth/login` | Tabla `users` sin migrar, `DATABASE_URL`/SSL incorrectos, o `JWT_SECRET` ausente. Usuario de Railway **no** existe en Supabase vacío → debe crear admin (bootstrap o `npm run bootstrap:admin`). Con usuario inexistente la API debe responder **401**, no 500. |

| `relation "Users" does not exist` | Migraciones no ejecutadas contra Supabase. Ver sección **Primer login** abajo. |

| `The server does not support SSL connections` | `DATABASE_URL` apunta a Postgres local sin SSL pero Sequelize forzaba SSL. Usar `?sslmode=require` en Supabase o `DB_SSL=false` solo en local. |



El servidor hace **listen primero** en `0.0.0.0` y responde `/health` aunque la BD falle después. La API completa y las migraciones **sí** requieren `DATABASE_URL`. **`/health` y el SPA no dependen de la BD.**



## Variables de entorno en producción



- **No** se carga `.env` cuando `NODE_ENV=production` o cuando Fly define `FLY_APP_NAME`.

- **No** incluya `.env` en la imagen Docker (`.dockerignore`).

- Configure **solo** `fly secrets` para secretos (`DATABASE_URL`, `JWT_SECRET`, etc.).

- **No** defina `PORT` en secrets ni en `.env`: Fly lo inyecta automáticamente igual a `internal_port` en `fly.toml` (8080).



## Secrets obligatorios (antes del deploy)



### Supabase — usar Session pooler (NO Direct / IPv6)



En el panel de Supabase: **Project Settings → Database → Connection string → URI → Session pooler** (puerto **6543**).



**No use** “Direct connection” (`db.<ref>.supabase.co`) en Fly: suele resolver a IPv6 y falla con `ECONNREFUSED`.



Formato exacto:



```text

postgres://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require

```



Ejemplo (sustituya `[PROJECT_REF]`, contraseña y región):



```text

postgres://postgres.abcdefghijklmnop:TuContraseñaSegura@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require

```



**Nota IPv4:** Si el pooler sigue fallando, en Supabase puede activar el add-on **IPv4** (Settings → Add-ons) para obtener un host IPv4 dedicado.



Comando:



```bash

fly secrets set \

  DATABASE_URL="postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require" \

  JWT_SECRET="tu-secreto-largo-aleatorio" \

  CORS_ORIGINS="https://nexusdoc-dms.fly.dev,https://tu-dominio.com" \

  -a nexusdoc-dms

```



**No** pase `NODE_ENV` ni `PORT` en secrets salvo que sepa lo que hace; `fly.toml` ya fija `NODE_ENV=production` y Fly inyecta `PORT=8080`.



Opcionales (bootstrap de admin, email, etc.):

```bash
fly secrets set \
  BOOTSTRAP_ADMIN_EMAIL="tu@correo.com" \
  BOOTSTRAP_ADMIN_PASSWORD="[SU-CONTRASEÑA]" \
  -a nexusdoc-dms
fly deploy -a nexusdoc-dms
```

También puede crear el admin **una vez** contra Supabase desde su PC: `cd server && npm run bootstrap:admin` (con `DATABASE_URL` apuntando al pooler). Ver `server/.env.example` y `README.md`.



Comprobar secrets:



```bash

fly secrets list -a nexusdoc-dms

```



Si antes tenía un `DATABASE_URL` incorrecto (Direct / IPv6) o `PORT=3000` en secrets, **elimínelos** y vuelva a configurar solo los valores correctos:



```bash

fly secrets unset PORT -a nexusdoc-dms

fly secrets set DATABASE_URL="postgres://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require" -a nexusdoc-dms

```



## Desplegar



Desde la raíz del repo (con `fly.toml` y `Dockerfile`):



```bash

fly deploy -a nexusdoc-dms

```



**Importante:** Los cambios en `fly.toml` (p. ej. `internal_port`, `[env]`, checks) **no** se aplican a las máquinas en Fly hasta un **`fly deploy`**. Verifique la config desplegada:



```bash

fly config show -a nexusdoc-dms

```



Debe mostrar `internal_port = 8080` bajo `[http_service]`. **No** debe haber `PORT=3030` ni `PORT=3000` en `[env]` del repo (Fly inyecta `PORT` automáticamente). Si `fly config show` aún muestra **3030**, redespliegue y revise en [Fly → Machines](https://fly.io/apps/nexusdoc-dms/machines) que el puerto interno sea **8080**.



Tras el deploy:



```bash

fly logs -a nexusdoc-dms

curl -s https://nexusdoc-dms.fly.dev/health

```



Debes ver algo como `OK - Servidor Vivo` y en logs **sin** `injecting env from .env`:



```text

[start] ... PORT=8080 DATABASE_URL=set JWT_SECRET=set

🚀 SERVIDOR WEB ACTIVO EN PUERTO: 8080 (health + SPA inmediato)

✅ PostgreSQL Connected Successfully!

```



## Puertos y health checks



- `fly.toml` → `[http_service] internal_port = 8080` (no el **3030** por defecto de algunos `fly launch`; este repo no usa formato legacy `[[services]]`).

- Fly inyecta `PORT=8080` automáticamente; debe coincidir con `internal_port`. Si la app escucha en **8080** pero Fly/proxy usa **3030**, los health checks fallan.

- La app escucha en **`0.0.0.0:${PORT}`** (no `127.0.0.1`).

- No fije `PORT` (ni `3000`, ni `3030`) en `.env`, secrets ni `[env]` de `fly.toml`.

- Tras cambiar `fly.toml`, ejecute **`fly deploy -a nexusdoc-dms`** y confirme con **`fly config show -a nexusdoc-dms`**.



## Base de datos



- Producción: **solo** `DATABASE_URL` (Postgres gestionado, Supabase Session pooler con SSL).

- En producción **no** hay fallback a `localhost`; sin URL verás un error explícito en logs, pero `/health` puede seguir respondiendo.

- Si `DATABASE_URL` es IPv6 o Supabase Direct, verá un error claro en logs; opcionalmente `REJECT_IPV6_DB=true` aborta el arranque.



### Supabase / SSL



Use la URI del **Session pooler** con `?sslmode=require` y puerto **6543**:



```text

postgres://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require

```



Para depuración local contra Postgres sin SSL: `DB_SSL=false` (no usar en Fly).



## Redeploy tras cambiar secrets



Los secrets no se aplican a máquinas ya corriendo hasta un nuevo deploy:



```bash

fly secrets set DATABASE_URL="postgres://..." -a nexusdoc-dms

fly deploy -a nexusdoc-dms

```



## Instrucciones rápidas (español)



1. En Supabase: **Connection string → URI → Session pooler** (puerto **6543**). Copie la URI completa.

2. En Fly, configure el secret (sustituya la URI real):



   ```bash

   fly secrets unset PORT -a nexusdoc-dms

   fly secrets set DATABASE_URL="postgres://postgres.xxxxx:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" JWT_SECRET="secreto-largo" -a nexusdoc-dms

   ```



3. **Redespliegue** (obligatorio si cambió `fly.toml` o secrets):



   ```bash

   fly deploy -a nexusdoc-dms

   fly config show -a nexusdoc-dms

   ```



   En [fly.io → nexusdoc-dms → Machines](https://fly.io/apps/nexusdoc-dms/machines), confirme puerto interno **8080**, no **3030**.



4. Verifique logs (no debe aparecer `injecting env from .env`; puerto **8080**; **no** `0.0.0.0:3030` en proxy checks; conexión PostgreSQL OK):



   ```bash

   fly logs -a nexusdoc-dms

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



   Buscar: `[static] distPath=... index.html=ok`, `PostgreSQL Connected`, **no** `injecting env from .env`.



4. **Smoke local antes de deploy:**



   ```bash

   cd client && npm run build

   cd ../server

   set NODE_ENV=production

   set JWT_SECRET=test

   node index.js

   ```



   En otra terminal: `curl http://127.0.0.1:8080/health` y `curl -I http://127.0.0.1:8080/dashboard`



## Primer login (Supabase vacío)

Los usuarios de la base **antigua (Railway)** no se copian solos a Supabase. Debe ejecutar migraciones y crear un administrador antes del primer acceso.

En **PowerShell** (Windows), sustituya `[SU-URI-SUPABASE]` por la URI del **Session pooler** (puerto **6543**, `?sslmode=require`) y `[SU-CONTRASEÑA]` por una clave de al menos 7 caracteres.

**1. Migraciones (una sola vez):**

```powershell
cd C:\Users\USER\NexusDoc_DMS\server
# Comillas simples si la contraseña tiene $, !, # u otros caracteres especiales de PowerShell
$env:DATABASE_URL='postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-us-east-1.pooler.supabase.co:6543/postgres?sslmode=require'
npm run db:migrate
npm run db:migrate:status
```

(`NODE_ENV=production` solo es obligatorio con `npm run db:migrate:prod`; con `DATABASE_URL` definida, `db:migrate` ya usa el pooler vía `sequelize-cli.cjs`.)

**2. Secrets de bootstrap en Fly:**

```powershell
fly secrets set BOOTSTRAP_ADMIN_EMAIL="edwinalvarezvivero@yahoo.com" BOOTSTRAP_ADMIN_PASSWORD="[SU-CONTRASEÑA]" -a nexusdoc-dms
```

**3. Redespliegue:**

```powershell
fly deploy -a nexusdoc-dms
```

**Alternativa local** (sin dejar la contraseña en Fly): tras migrar, en la misma carpeta `server`:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="edwinalvarezvivero@yahoo.com"
$env:BOOTSTRAP_ADMIN_PASSWORD="[SU-CONTRASEÑA]"
npm run bootstrap:admin
```

Verifique login en https://nexusdoc-dms.fly.dev/dashboard — credenciales incorrectas → **401**; BD caída o sin migrar → **503** (el error real queda solo en logs del servidor).

Tras el primer login puede quitar los secrets bootstrap: `fly secrets unset BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_PASSWORD -a nexusdoc-dms`

## Railway vs Fly

Railway usa `railway.toml` y el mismo `Dockerfile`. Fly usa este `fly.toml`. Puedes mantener ambos; cada plataforma ignora la config de la otra.

