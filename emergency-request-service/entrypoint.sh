#!/bin/sh
set -e

echo "Starting Emergency Request Service..."
echo "Waiting for database..."
sleep 5

echo "Running database migrations..."
npx prisma migrate deploy || npx prisma db push

echo "Starting server..."
exec node src/server.js
