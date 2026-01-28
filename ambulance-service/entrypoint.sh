#!/bin/sh
set -e

echo "Starting Ambulance Service..."
echo "Waiting for database..."
sleep 5

echo "Running database migrations..."
npx prisma migrate deploy || npx prisma db push

echo "Initializing database..."
node src/init-db.js || true

echo "Starting server..."
exec node src/server.js
