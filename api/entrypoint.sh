#!/bin/sh
set -e

echo "=> Running database migrations..."
node -e "import('./src/db/migrate.js').then(m => m.runMigrations().then(() => process.exit(0)).catch(e => {
  console.error(e); process.exit(1); }))"

echo "=> Starting S2dent API..."
exec node server.js