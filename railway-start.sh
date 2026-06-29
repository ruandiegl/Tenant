#!/bin/sh
set -e

WAHA_INTERNAL_PORT="${WAHA_INTERNAL_PORT:-3000}"
BACKEND_PORT="${PORT:-3333}"

cd /app/backend
./node_modules/.bin/prisma migrate deploy

if [ "$SEED_ON_DEPLOY" = "true" ]; then
  npm run seed
fi

cd /app
PORT="$WAHA_INTERNAL_PORT" /entrypoint.sh &
WAHA_PID=$!

cd /app/backend
PORT="$BACKEND_PORT" WAHA_BASE_URL="${WAHA_BASE_URL:-http://127.0.0.1:$WAHA_INTERNAL_PORT}" node dist/src/server.js &
BACKEND_PID=$!

trap 'kill "$WAHA_PID" "$BACKEND_PID" 2>/dev/null || true' INT TERM
wait "$BACKEND_PID"
