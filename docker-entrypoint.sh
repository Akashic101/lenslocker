#!/bin/sh
set -e

DB_PATH="${DATABASE_URL:-/data/lenslocker.db}"

echo "Using database: $DB_PATH"

# Ensure directory exists
mkdir -p "$(dirname "$DB_PATH")"

if [ ! -f "$DB_PATH" ]; then
  echo "No database found — first run initialization"
  FIRST_RUN=true
else
  echo "Existing database found"
  FIRST_RUN=false
fi

echo "Running migrations..."
bun drizzle-kit push --force

echo "Starting app..."
exec bun run start