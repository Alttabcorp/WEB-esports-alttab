#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ] && [ -d /app/prisma/migrations ]; then
  echo "Aplicando migrations Prisma…"
  NODE_PATH=/opt/prisma-cli/node_modules:/app/node_modules \
    node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy
fi

exec node server.js
