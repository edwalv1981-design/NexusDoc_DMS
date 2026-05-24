#!/usr/bin/env node
/**
 * Prueba rápida: SELECT 1 vía pg (misma librería que la app).
 * Uso: node scripts/test-pg-connection.mjs "postgres://..."
 */
import pg from 'pg';

const url = process.argv[2]?.trim();
if (!url) {
  console.error('Uso: node scripts/test-pg-connection.mjs "<DATABASE_URL>"');
  process.exit(2);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  const res = await client.query('SELECT 1 AS ok');
  console.log(`OK SELECT 1 → ${res.rows[0]?.ok ?? 1}`);
  process.exit(0);
} catch (err) {
  console.error(err.message || String(err));
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
