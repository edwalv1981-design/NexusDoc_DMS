# Checklist post-deploy — NexusDoc DMS

Comprobaciones automáticas para confirmar que el sitio en Railway responde **después** de un deploy, sin repetir manualmente login, dashboard y health.

## Cuándo ejecutar

- Tras un deploy en Railway en estado **Success** (verde).
- Si GitHub Actions o Railway mostraron incidente y quieres validar que producción volvió.
- Tras cambiar variables (`JWT_SECRET`, `DATABASE_URL`, dominio) o un redeploy manual.
- Opcional: el workflow [Deploy smoke (producción)](../.github/workflows/deploy-smoke.yml) corre cada **6 h** y tras CI en `main`.

## Comando rápido (producción)

Desde la raíz del repositorio:

```bash
npm run check:deploy:prod
```

Contra otra URL (staging, preview):

```bash
# Windows PowerShell
$env:SMOKE_BASE_URL="https://tu-url.railway.app"; npm run check:deploy

# Linux / macOS / Git Bash
SMOKE_BASE_URL=https://tu-url.railway.app npm run check:deploy
```

Con token JWT válido (opcional, exige **200** en la API de plantillas):

```bash
$env:SMOKE_TOKEN="tu-jwt"; npm run check:deploy:prod
```

**Código de salida:** `0` = todo OK, `1` = al menos un fallo (útil en CI y scripts).

## Qué comprueba cada ítem

| Comprobación | Significado |
|--------------|-------------|
| **GET /health** | El proceso Node escucha y responde antes del bootstrap completo. El cuerpo debe contener `OK` o `Servidor Vivo`. |
| **GET /** | Ruta raíz accesible (200). En producción suele ser texto corto o redirección al SPA. |
| **GET /dashboard** | El frontend compilado (`client/dist`) se sirve; debe ser **HTML** (200 + `text/html`). Si falla: build del cliente o `dist` ausente en la imagen Docker. |
| **GET /api/forms/templates/status** | La capa API está montada. Sin token: **401** o **200**; con `SMOKE_TOKEN`: solo **200**. Un **404** indica ruta API no registrada (revisar `server/routes`). |

Timeout por petición: **15 s**.

URL por defecto: `https://nexusdocdms-production.up.railway.app` (no confundir con `nexusducms` sin la **o** de *doc*).

## Si algo falla (FALLO)

1. **Estado de Railway:** [status.railway.app](https://status.railway.app)
2. **Logs del servicio:** Railway → proyecto → servicio NexusDoc_DMS → **Deployments** → último deploy → **View Logs**. Busca:
   - `SERVIDOR WEB ACTIVO EN PUERTO`
   - Errores de migración, `JWT_SECRET` ausente, o `Frontend no construido`
3. **Dominio:** variable y enlaces deben usar `nexusdocdms-production.up.railway.app`.
4. **Redeploy manual** (breve):
   - Railway → servicio → **Deployments**
   - En el deploy fallido o anterior estable: **⋯** → **Redeploy**
   - O push a `main` si el deploy es desde GitHub
   - Confirma **Builder = Dockerfile** si los logs no muestran `start-with-migrate.sh`
5. Vuelve a ejecutar: `npm run check:deploy:prod`

## GitHub Actions

- Workflow: `.github/workflows/deploy-smoke.yml`
- Disparadores: manual (**workflow_dispatch**), cada 6 h, o al terminar CI en `main` con éxito.
- Si el job falla, verás una **X roja** en Actions → corrige Railway y relanza el workflow o el comando local.

## Referencia

Script: `scripts/deploy-smoke-check.mjs`  
Variables: `DEPLOY_URL`, `SMOKE_BASE_URL`, `SMOKE_TOKEN` (opcional).
