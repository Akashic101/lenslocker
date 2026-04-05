#!/bin/sh
set -eu

if [ "${LENSLOCKER_SKIP_DB_PUSH:-}" != "1" ]; then
	echo "lenslocker: syncing database schema (drizzle-kit push)…"
	bun run db:push
fi

exec bun run start
