# Deploying LinkDeck on a Linux server

Tested layout: Ubuntu 22.04/24.04, Nginx on the host, the app on `127.0.0.1:3000`.
Replace `ourdomain.com` with your domain everywhere.

## 1. DNS

| Record | Name | Value |
|---|---|---|
| A | `ourdomain.com` | server IP |
| A | `*.ourdomain.com` | server IP (one record covers every client subdomain) |

## 2. Wildcard SSL certificate

A wildcard certificate needs a DNS challenge. Example with Cloudflare DNS:

```bash
sudo apt install -y nginx certbot python3-certbot-dns-cloudflare
# Put "dns_cloudflare_api_token = <token>" in /root/.cloudflare.ini, then chmod 600 it
sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials /root/.cloudflare.ini \
  -d ourdomain.com -d '*.ourdomain.com'
```

Other DNS providers have their own certbot plugin, or use `--manual --preferred-challenges dns`.

## 3. Get the code and configure

```bash
sudo mkdir -p /opt/linkdeck && sudo chown $USER /opt/linkdeck
git clone <repo> /opt/linkdeck && cd /opt/linkdeck
chmod +x deploy/scripts/*.sh
cp .env.example .env
nano .env    # ROOT_DOMAIN, NEXT_PUBLIC_APP_URL, NEXTAUTH_URL, secrets, DB password, SEED_ADMIN_*
```

Generate secrets with `openssl rand -base64 32` (for `NEXTAUTH_SECRET`) and `openssl rand -hex 16` (for `ANALYTICS_SALT`).

## 4a. Run with Docker (recommended)

```bash
./deploy/scripts/deploy-docker.sh
```

This builds the images, starts Postgres, runs migrations and the seed, starts the app and waits for `/api/health`. Run the same script again to deploy updates.

## 4b. Or run with PM2 (no Docker)

Requires Node 20+, PostgreSQL 14+ and `npm i -g pm2`.

```bash
sudo -u postgres createuser -P linkdeck && sudo -u postgres createdb -O linkdeck linkdeck
./deploy/scripts/deploy-pm2.sh
pm2 startup   # follow the printed command so PM2 starts on boot
```

PM2 runs **one** instance on purpose: the page cache and rate limiter live in memory. Add a Redis cache handler before you run a cluster.

## 5. Nginx

```bash
sudo mkdir -p /var/www/linkdeck/uploads /etc/nginx/linkdeck-domains /var/www/certbot
sudo cp deploy/nginx/linkdeck-common.conf /etc/nginx/snippets/
sudo cp deploy/nginx/linkdeck.conf /etc/nginx/sites-available/
sudo sed -i 's/ourdomain.com/YOURDOMAIN/g' /etc/nginx/sites-available/linkdeck.conf
sudo ln -s /etc/nginx/sites-available/linkdeck.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Nginx serves `/uploads/` from `/var/www/linkdeck/uploads`. Use the same path for `HOST_UPLOAD_DIR` (Docker) or `UPLOAD_DIR` (PM2).

## 6. Custom client domains

1. The client creates a `CNAME links.clientbrand.com → ourdomain.com`, or an A record pointing to the server IP.
2. In the builder, open **Settings → Custom domain**, enter the domain, save and publish.
3. On the server, run:

   ```bash
   sudo CERTBOT_EMAIL=you@ourdomain.com ./deploy/scripts/add-custom-domain.sh links.clientbrand.com
   ```

## 7. Cron (backups + analytics rollup)

Edit `deploy/scripts/crontab.example` to match your setup, then install it with `crontab -e`.

## Firewall

```bash
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

Do not expose port 3000 or 5432. Docker Compose binds the app to `127.0.0.1` only, and does not publish Postgres.

## Checks after deploy

- `curl https://ourdomain.com/api/health` returns `{"ok":true}`
- `https://ourdomain.com/login` lets you sign in with `SEED_ADMIN_EMAIL`
- `https://demo.ourdomain.com` shows the seeded Arabic demo page
- Replace the seed admin: create a new admin on the **Team** page, sign in as that admin, then delete the seed account.
