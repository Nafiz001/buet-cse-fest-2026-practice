#!/bin/sh
set -e

echo "Starting Hospital Service..."

# Wait for database to be ready
echo "Waiting for database..."
sleep 5

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy || npx prisma db push

# Initialize database with sample data if needed
echo "Initializing database..."
node src/init-db.js || true

# Start the application
echo "Starting server..."
exec node src/server.js
