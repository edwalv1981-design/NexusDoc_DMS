#!/usr/bin/env sh
# Production entrypoint: run Sequelize migrations, then start the API server.
# Exits non-zero on migrate failure so deploy platforms (e.g. Railway) mark the deploy failed.
set -eu

cd "$(dirname "$0")/.."

echo "[start] Running Sequelize migrations (db:migrate)..."
npm run db:migrate

echo "[start] Migrations OK. Starting server..."
exec node index.js
