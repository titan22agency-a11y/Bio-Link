#!/usr/bin/env bash
# Zero-config Docker deploy / update. Run from the repo root on the server.
set -euo pipefail
cd "$(dirname "$0")/../.."

[ -f .env ] || { echo "Create .env from .env.example first"; exit 1; }
set -a; . ./.env; set +a

sudo mkdir -p "${HOST_UPLOAD_DIR:-/var/www/linkdeck/uploads}"
sudo chown 1001:1001 "${HOST_UPLOAD_DIR:-/var/www/linkdeck/uploads}"

git pull --ff-only || true
docker compose --profile tools build app migrate
docker compose up -d db
docker compose --profile tools run --rm migrate
docker compose up -d app
docker image prune -f >/dev/null

echo "Waiting for health check…"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then echo "✔ App is up"; exit 0; fi
  sleep 2
done
echo "✖ App did not become healthy"; docker compose logs --tail=80 app; exit 1
