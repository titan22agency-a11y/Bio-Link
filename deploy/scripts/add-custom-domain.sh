#!/usr/bin/env bash
# Usage: sudo ./add-custom-domain.sh links.clientbrand.com
#
# 1. Client points the domain to this server (A record, or CNAME to ourdomain.com).
# 2. Support sets "Custom domain" on the page in the builder and publishes.
# 3. Run this script: issues a Let's Encrypt cert and adds an Nginx server block.
set -euo pipefail

DOMAIN="${1:?domain required}"
[[ "$DOMAIN" =~ ^([a-z0-9-]+\.)+[a-z]{2,}$ ]] || { echo "Invalid domain: $DOMAIN"; exit 1; }
EMAIL="${CERTBOT_EMAIL:-admin@ourdomain.com}"
CONF_DIR=/etc/nginx/linkdeck-domains

mkdir -p "$CONF_DIR" /var/www/certbot

certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
  --email "$EMAIL" --agree-tos --non-interactive

cat > "$CONF_DIR/$DOMAIN.conf" <<EOF
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name $DOMAIN;
    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/nginx/snippets/linkdeck-common.conf;
}
EOF

nginx -t && systemctl reload nginx
echo "✔ https://$DOMAIN is live"
