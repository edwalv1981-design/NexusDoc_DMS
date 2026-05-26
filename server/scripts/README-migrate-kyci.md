# Migración KYCI (formularios Cumplimiento Individual)

Script: `migrate-kyci-form-data.js` — convierte borradores guardados con claves legacy (Fondos) a claves KYCI (`firstName`, `lastName`, etc.).

**No se ejecuta en deploy.** Es manual y debe correrse después de `db:migrate` (tabla `template_field_schemas`).

## Orden en Railway (Shell del servicio app)

Desde la raíz del repo (`/app` en Docker):

```bash
npm run db:migrate
npm run migrate:kyci -- --dry-run
npm run migrate:kyci
npm run migrate:kyci -- --dry-run
```

Equivalente solo en `server/`:

```bash
cd server
npm run db:migrate
npm run migrate:kyci -- --dry-run
npm run migrate:kyci
```

## Antes de aplicar

1. Backup: servicio Postgres en Railway → **Backups** → crear/restaurar punto si algo falla.
2. Confirmar variable `DATABASE_URL` en el servicio **NexusDoc_DMS** (no solo en Postgres).
3. Siempre `--dry-run` primero; aplicar solo si `Would migrate` > 0 y `Errors: 0`.

## Leer el resumen (dry-run)

| Línea | Significado |
|-------|-------------|
| `Cumplimiento Individual forms found` | Total formularios KYCI en BD |
| `Would migrate` / `Migrated` | Filas que se actualizarían / se actualizaron |
| `Skipped (no legacy)` | Ya en formato KYCI o sin marcadores legacy |
| `Unchanged` | Legacy detectado pero sin cambios aplicables |
| `Errors` | Debe ser **0** antes del apply |

Tras el apply, un segundo `--dry-run` debe mostrar `Would migrate: 0`.

## Local (opcional)

```bash
cd server
# DATABASE_URL apuntando a la BD objetivo
node scripts/migrate-kyci-form-data.js --dry-run
node scripts/migrate-kyci-form-data.js
```

Verbose: añadir `--verbose` a cualquier comando.
