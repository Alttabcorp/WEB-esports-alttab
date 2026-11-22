#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ] && [ -d /app/prisma/migrations ]; then
  echo "Aplicando migrations Prisma…"
  node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy
fi

exec node server.js
