#!/usr/bin/env sh
# Production entrypoint: run Sequelize migrations, then start the API server.
# Exits non-zero on migrate failure so deploy platforms (e.g. Railway) mark the deploy failed.
set -eu

export NODE_ENV="${NODE_ENV:-production}"

cd "$(dirname "$0")/.."

echo "[start] NODE_ENV=${NODE_ENV}"
echo "[start] Running Sequelize migrations (production)..."
node scripts/run-migrate-prod.cjs

echo "[start] Migrations OK. Starting server..."
exec node index.js
