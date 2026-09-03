#!/bin/sh
set -e

echo "[api] prisma migrate deploy"
./node_modules/.bin/prisma migrate deploy

echo "[api] starting node dist/index.js"
exec node dist/index.js
