#!/usr/bin/env bash
# Nightly backup: Postgres dump + uploads tarball, keeps 14 days.
# Works for both Docker (MODE=docker) and bare-metal (MODE=local) installs.
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a

MODE="${MODE:-docker}"
DEST="${BACKUP_DIR:-$(pwd)/backups}"
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DEST"

if [ "$MODE" = docker ]; then
  docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$DEST/db-$STAMP.dump"
else
  pg_dump "$DATABASE_URL" -Fc > "$DEST/db-$STAMP.dump"
fi
tar -czf "$DEST/uploads-$STAMP.tgz" -C "${HOST_UPLOAD_DIR:-${UPLOAD_DIR:-/var/www/linkdeck/uploads}}" .

find "$DEST" -type f -mtime +14 -delete
echo "Backup written to $DEST ($STAMP)"
# Restore: pg_restore --clean -d "$DATABASE_URL" db-<stamp>.dump
