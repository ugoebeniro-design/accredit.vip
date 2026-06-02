#!/bin/bash
set -e

# ─── Config ───────────────────────────────────────────────
DOMAIN="accredit.vip"
REPO_URL="https://github.com/ugoebeniro-design/accredit.vip.git"
APP_DIR="/home/deploy/accredit.vip"
DEPLOY_USER="deploy"

echo "==> Updating system packages"
apt update && apt upgrade -y

echo "==> Installing dependencies"
apt install -y python3-pip python3-venv nginx git certbot python3-certbot-nginx curl

echo "==> Installing Node.js 20"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "==> Creating deploy user"
id -u $DEPLOY_USER &>/dev/null || adduser --disabled-password --gecos "" $DEPLOY_USER
usermod -aG sudo $DEPLOY_USER

echo "==> Cloning repository"
sudo -u $DEPLOY_USER git clone $REPO_URL $APP_DIR

echo "==> Setting up backend"
sudo -u $DEPLOY_USER bash -c "
  cd $APP_DIR/backend
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
"
cp $APP_DIR/backend/.env.production $APP_DIR/backend/.env
echo "  -> Edit $APP_DIR/backend/.env with your actual secrets (Supabase URL, JWT secret, Paystack keys, SMTP)"

echo "==> Setting up frontend"
sudo -u $DEPLOY_USER bash -c "
  cd $APP_DIR/frontend
  npm ci
  npm run build
  cp .env.production .env.local
"

echo "==> Installing systemd services"
cp $APP_DIR/deploy/accredit-api.service /etc/systemd/system/
cp $APP_DIR/deploy/accredit-web.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now accredit-api
systemctl enable --now accredit-web

echo "==> Configuring Nginx"
rm -f /etc/nginx/sites-enabled/default
cp $APP_DIR/deploy/accredit.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/accredit.conf /etc/nginx/sites-enabled/
nginx -t

echo "==> Obtaining SSL certificate"
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

systemctl reload nginx

echo ""
echo "===== DEPLOYMENT COMPLETE ====="
echo "Backend:  https://$DOMAIN/api/v1/health"
echo "Frontend: https://$DOMAIN"
echo ""
echo "Next steps:"
echo "  1. Edit $APP_DIR/backend/.env with your real secrets"
echo "  2. Run: sudo -u $DEPLOY_USER nano $APP_DIR/backend/.env"
echo "  3. Restart API: sudo systemctl restart accredit-api"
echo "  4. Run DB migrations: sudo -u $DEPLOY_USER bash -c 'cd $APP_DIR/backend && source venv/bin/activate && alembic upgrade head'"
