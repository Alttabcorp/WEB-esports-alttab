#!/bin/sh
set -eu

# Migrações: `npx prisma migrate deploy` no host/CI antes do up
# (Prisma CLI fica em devDependency; o standalone não embute o CLI completo).
exec node server.js
