#!/usr/bin/env sh
# Production entrypoint: start API immediately; run migrations in background.
set -eu

export NODE_ENV="${NODE_ENV:-production}"

cd "$(dirname "$0")/.."

echo "[start] NODE_ENV=${NODE_ENV}"
echo "[start] Running Sequelize migrations in background..."
(
  if node scripts/run-migrate-prod.cjs; then
    echo "[start] db:migrate completado."
  else
    echo "[start] WARN: db:migrate falló (revisar DATABASE_URL y SequelizeMeta)."
  fi
) &

echo "[start] Starting server (listen-first)..."
exec node index.js
