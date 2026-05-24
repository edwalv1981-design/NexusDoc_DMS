# Despliegue en Fly.io â€” NexusDoc DMS



## Causa de los fallos tÃ­picos



| SÃ­ntoma en logs | Causa |

|-----------------|--------|

| `injecting env (8) from .env` en producciÃ³n | Un `.env` dentro de la imagen Docker **sobrescribe** `fly secrets` (p. ej. `DATABASE_URL` local, `PORT=3000`). La app ya **no** carga `.env` si `NODE_ENV=production` o `FLY_APP_NAME` estÃ¡ definido; `.dockerignore` excluye `.env` / `.env.local`. |

| `connect ECONNREFUSED` a IPv6 (`2800:â€¦:5432`) | `DATABASE_URL` usa Supabase **Direct** (IPv6). Fly necesita el **Session pooler** (IPv4, puerto **6543**). |

| `connect ECONNREFUSED 127.0.0.1:5432` | No existe `DATABASE_URL` en secrets. Sequelize caÃ­a al modo â€œlocalâ€ (`localhost:5432`). |

| `[migrate] db:migrate fallÃ³ (cÃ³digo 1)` | Misma razÃ³n: migraciones sin URL de Postgres (p. ej. Supabase pooler). |

| `PORT=3000` en logs pero `internal_port = 8080` | `.env` en imagen o secret obsoleto fijaba `PORT=3000`. Fly inyecta `PORT` = `internal_port` (8080); deben coincidir. |

| `instance refused connection` en `0.0.0.0:3000` | Proxy Fly al 8080 pero la app escuchaba 3000. Tras el fix, logs deben mostrar puerto **8080**. |

| Proxy / health checks en `0.0.0.0:3030` | `fly launch` antiguo dejÃ³ `internal_port = 3030` en Fly aunque el repo usa **8080**. La app escucha 8080 pero el proxy apunta a 3030 â†’ conexiÃ³n rechazada. |

| **HTTP 500** en `/` o `/dashboard` | Imagen sin `client/dist` (build fallÃ³) o middleware SPA roto. |

| **HTTP 503** en `/dashboard` | `client/dist/index.html` no existe en el contenedor â€” revisar paso `npm run build` del `Dockerfile`. |

| **HTTP 500** en `POST /api/auth/login` | Tabla `users` sin migrar, `DATABASE_URL`/SSL incorrectos, o `JWT_SECRET` ausente. Usuario de Railway **no** existe en Supabase vacÃ­o â†’ debe crear admin (bootstrap o `npm run bootstrap:admin`). Con usuario inexistente la API debe responder **401**, no 500. |

| `relation "Users" does not exist` | Migraciones no ejecutadas contra Supabase. Ver secciÃ³n **Primer login** abajo. |

| `The server does not support SSL connections` | `DATABASE_URL` apunta a Postgres local sin SSL pero Sequelize forzaba SSL. Usar `?sslmode=require` en Supabase o `DB_SSL=false` solo en local. |



El servidor hace **listen primero** en `0.0.0.0` y responde `/health` aunque la BD falle despuÃ©s. La API completa y las migraciones **sÃ­** requieren `DATABASE_URL`. **`/health` y el SPA no dependen de la BD.**



## Variables de entorno en producciÃ³n



- **No** se carga `.env` cuando `NODE_ENV=production` o cuando Fly define `FLY_APP_NAME`.

- **No** incluya `.env` en la imagen Docker (`.dockerignore`).

- Configure **solo** `fly secrets` para secretos (`DATABASE_URL`, `JWT_SECRET`, etc.).

- **No** defina `PORT` en secrets ni en `.env`: Fly lo inyecta automÃ¡ticamente igual a `internal_port` en `fly.toml` (8080).



## Secrets obligatorios (antes del deploy)



### Supabase â€” usar Session pooler (NO Direct / IPv6)



En el panel de Supabase: **Project Settings â†’ Database â†’ Connection string â†’ URI â†’ Session pooler** (puerto **6543**).



**No use** â€œDirect connectionâ€ (`db.<ref>.supabase.co`) en Fly: suele resolver a IPv6 y falla con `ECONNREFUSED`.



Formato exacto:



```text

postgres://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require

```



Ejemplo (sustituya `[PROJECT_REF]`, contraseÃ±a y regiÃ³n):



```text

postgres://postgres.abcdefghijklmnop:TuContraseÃ±aSegura@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require

```



**Nota IPv4:** Si el pooler sigue fallando, en Supabase puede activar el add-on **IPv4** (Settings â†’ Add-ons) para obtener un host IPv4 dedicado.



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
  BOOTSTRAP_ADMIN_PASSWORD="[SU-CONTRASEÃ‘A]" \
  -a nexusdoc-dms
fly deploy -a nexusdoc-dms
```

TambiÃ©n puede crear el admin **una vez** contra Supabase desde su PC: `cd server && npm run bootstrap:admin` (con `DATABASE_URL` apuntando al pooler). Ver `server/.env.example` y `README.md`.



Comprobar secrets:



```bash

fly secrets list -a nexusdoc-dms

```



Si antes tenÃ­a un `DATABASE_URL` incorrecto (Direct / IPv6) o `PORT=3000` en secrets, **elimÃ­nelos** y vuelva a configurar solo los valores correctos:



```bash

fly secrets unset PORT -a nexusdoc-dms

fly secrets set DATABASE_URL="postgres://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require" -a nexusdoc-dms

```



## Desplegar



Desde la raÃ­z del repo (con `fly.toml` y `Dockerfile`):



```bash

fly deploy -a nexusdoc-dms

```



**Importante:** Los cambios en `fly.toml` (p. ej. `internal_port`, `[env]`, checks) **no** se aplican a las mÃ¡quinas en Fly hasta un **`fly deploy`**. Verifique la config desplegada:



```bash

fly config show -a nexusdoc-dms

```



Debe mostrar `internal_port = 8080` bajo `[http_service]`. **No** debe haber `PORT=3030` ni `PORT=3000` en `[env]` del repo (Fly inyecta `PORT` automÃ¡ticamente). Si `fly config show` aÃºn muestra **3030**, redespliegue y revise en [Fly â†’ Machines](https://fly.io/apps/nexusdoc-dms/machines) que el puerto interno sea **8080**.



Tras el deploy:



```bash

fly logs -a nexusdoc-dms

curl -s https://nexusdoc-dms.fly.dev/health

```



Debes ver algo como `OK - Servidor Vivo` y en logs **sin** `injecting env from .env`:



```text

[start] ... PORT=8080 DATABASE_URL=set JWT_SECRET=set

ðŸš€ SERVIDOR WEB ACTIVO EN PUERTO: 8080 (health + SPA inmediato)

âœ… PostgreSQL Connected Successfully!

```



## Puertos y health checks



- `fly.toml` â†’ `[http_service] internal_port = 8080` (no el **3030** por defecto de algunos `fly launch`; este repo no usa formato legacy `[[services]]`).

- Fly inyecta `PORT=8080` automÃ¡ticamente; debe coincidir con `internal_port`. Si la app escucha en **8080** pero Fly/proxy usa **3030**, los health checks fallan.

- La app escucha en **`0.0.0.0:${PORT}`** (no `127.0.0.1`).

- No fije `PORT` (ni `3000`, ni `3030`) en `.env`, secrets ni `[env]` de `fly.toml`.

- Tras cambiar `fly.toml`, ejecute **`fly deploy -a nexusdoc-dms`** y confirme con **`fly config show -a nexusdoc-dms`**.



## Base de datos



- ProducciÃ³n: **solo** `DATABASE_URL` (Postgres gestionado, Supabase Session pooler con SSL).

- En producciÃ³n **no** hay fallback a `localhost`; sin URL verÃ¡s un error explÃ­cito en logs, pero `/health` puede seguir respondiendo.

- Si `DATABASE_URL` es IPv6 o Supabase Direct, verÃ¡ un error claro en logs; opcionalmente `REJECT_IPV6_DB=true` aborta el arranque.



### Supabase / SSL



Use la URI del **Session pooler** con `?sslmode=require` y puerto **6543**:



```text

postgres://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require

```



Para depuraciÃ³n local contra Postgres sin SSL: `DB_SSL=false` (no usar en Fly).



## Redeploy tras cambiar secrets



Los secrets no se aplican a mÃ¡quinas ya corriendo hasta un nuevo deploy:



```bash

fly secrets set DATABASE_URL="postgres://..." -a nexusdoc-dms

fly deploy -a nexusdoc-dms

```



## Instrucciones rÃ¡pidas (espaÃ±ol)



1. En Supabase: **Connection string â†’ URI â†’ Session pooler** (puerto **6543**). Copie la URI completa.

2. En Fly, configure el secret (sustituya la URI real):



   ```bash

   fly secrets unset PORT -a nexusdoc-dms

   fly secrets set DATABASE_URL="postgres://postgres.xxxxx:CONTRASEÃ‘A@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" JWT_SECRET="secreto-largo" -a nexusdoc-dms

   ```



3. **Redespliegue** (obligatorio si cambiÃ³ `fly.toml` o secrets):



   ```bash

   fly deploy -a nexusdoc-dms

   fly config show -a nexusdoc-dms

   ```



   En [fly.io â†’ nexusdoc-dms â†’ Machines](https://fly.io/apps/nexusdoc-dms/machines), confirme puerto interno **8080**, no **3030**.



4. Verifique logs (no debe aparecer `injecting env from .env`; puerto **8080**; **no** `0.0.0.0:3030` en proxy checks; conexiÃ³n PostgreSQL OK):



   ```bash

   fly logs -a nexusdoc-dms

   ```



## VerificaciÃ³n post-deploy (orden recomendado)



1. **Probar `/health` primero** (despierta la mÃ¡quina si `auto_stop_machines` estÃ¡ activo):



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



## Primer login (Supabase vacÃ­o)

Los usuarios de la base **antigua (Railway)** no se copian solos a Supabase. Debe ejecutar migraciones y crear un administrador antes del primer acceso.

En **PowerShell** (Windows), sustituya `[SU-URI-SUPABASE]` por la URI del **Session pooler** (puerto **6543**, `?sslmode=require`) y `[SU-CONTRASEÃ‘A]` por una clave de al menos 7 caracteres.

**1. Migraciones (una sola vez):**

```powershell
cd C:\Users\USER\NexusDoc_DMS\server
# Comillas simples si la contraseÃ±a tiene $, !, # u otros caracteres especiales de PowerShell
$env:DATABASE_URL='postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require'
npm run db:migrate
npm run db:migrate:status
```

(`NODE_ENV=production` solo es obligatorio con `npm run db:migrate:prod`; con `DATABASE_URL` definida, `db:migrate` ya usa el pooler vÃ­a `sequelize-cli.cjs`.)

**2. Secrets de bootstrap en Fly:**

```powershell
fly secrets set BOOTSTRAP_ADMIN_EMAIL="edwinalvarezvivero@yahoo.com" BOOTSTRAP_ADMIN_PASSWORD="[SU-CONTRASEÃ‘A]" -a nexusdoc-dms
```

**3. Redespliegue:**

```powershell
fly deploy -a nexusdoc-dms
```

**Alternativa local** (sin dejar la contraseÃ±a en Fly): tras migrar, en la misma carpeta `server`:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="edwinalvarezvivero@yahoo.com"
$env:BOOTSTRAP_ADMIN_PASSWORD="[SU-CONTRASEÃ‘A]"
npm run bootstrap:admin
```

Verifique login en https://nexusdoc-dms.fly.dev/dashboard â€” credenciales incorrectas â†’ **401**; BD caÃ­da o sin migrar â†’ **503** (el error real queda solo en logs del servidor).

Tras el primer login puede quitar los secrets bootstrap: `fly secrets unset BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_PASSWORD -a nexusdoc-dms`

## Railway vs Fly

Railway usa `railway.toml` y el mismo `Dockerfile`. Fly usa este `fly.toml`. Puedes mantener ambos; cada plataforma ignora la config de la otra.
## Automatización local (una vez)

Si `DATABASE_URL` en Fly tiene host `.supabase.co` (error `getaddrinfo ENOTFOUND`) o falla la autenticación, corrija el secret con el **Session pooler** (`.supabase.com`, puerto **6543**):

```powershell
fly secrets set DATABASE_URL="postgres://postgres.ohwqfujrakhwxfuxo:[PASSWORD-URL-ENCODED]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -a nexusdoc-dms
```

Codifique caracteres especiales de la contraseña (`@`, `#`, `%`, etc.) con `encodeURIComponent` antes de pegarla en la URL.

O ejecute el script completo desde la raíz del repo (abre Supabase, pide la contraseña una vez; si `db.*.supabase.co` no resuelve DNS en su red, migra por Session pooler **aws-0** `:5432`/`6543`; escribe `server/.env`, crea admin, actualiza secrets y hace `fly deploy`):

```powershell
.\scripts\setup-supabase-once.ps1
```


