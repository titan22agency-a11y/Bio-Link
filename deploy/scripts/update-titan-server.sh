#!/usr/bin/env bash
# Redeploy the current commit to titan-server (Caddy + systemd setup).
# Run from the repo root on your PC (Git Bash): ./deploy/scripts/update-titan-server.sh
set -euo pipefail
SERVER="${SERVER:-root@64.227.37.164}"

git archive --format=tar.gz -o /tmp/linkdeck.tgz HEAD
scp -q /tmp/linkdeck.tgz "$SERVER:/tmp/linkdeck.tgz"
rm -f /tmp/linkdeck.tgz

ssh "$SERVER" 'set -e
cd /opt/linkdeck
find . -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +
tar -xzf /tmp/linkdeck.tgz && rm /tmp/linkdeck.tgz
npm ci --no-audit --no-fund --loglevel=error
set -a; . /etc/linkdeck.env; set +a
npx prisma migrate deploy
NODE_OPTIONS=--max-old-space-size=1536 npx next build
cp -r public .next/standalone/ && mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/
chown -R linkdeck:linkdeck /opt/linkdeck
systemctl restart linkdeck
sleep 4
curl -fsS http://127.0.0.1:3500/api/health && echo " ✔ deployed"'
