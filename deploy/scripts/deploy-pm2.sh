#!/usr/bin/env bash
# Bare-metal deploy with PM2 (needs Node 20+, PostgreSQL, PM2 installed).
# Run from the repo root on the server.
set -euo pipefail
cd "$(dirname "$0")/../.."

[ -f .env ] || { echo "Create .env from .env.example first"; exit 1; }
set -a; . ./.env; set +a

git pull --ff-only || true
npm ci
npx prisma migrate deploy
npm run build

# Standalone output does not include static assets/public; copy them in.
cp -r public .next/standalone/
mkdir -p .next/standalone/.next logs "${UPLOAD_DIR:-/var/www/linkdeck/uploads}"
cp -r .next/static .next/standalone/.next/

# First deploy only: seed the admin account (idempotent anyway).
npm run db:seed || true

pm2 startOrReload ecosystem.config.js --update-env
pm2 save
echo "✔ Deployed. Logs: pm2 logs linkdeck"
