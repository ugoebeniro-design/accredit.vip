#!/bin/bash
set -e

APP_DIR="/home/deploy/accredit.vip"

echo "==> Pulling latest code"
cd $APP_DIR
git pull origin main

echo "==> Updating backend"
cd $APP_DIR/backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
sudo systemctl restart accredit-api

echo "==> Updating frontend"
cd $APP_DIR/frontend
npm ci
npm run build
sudo systemctl restart accredit-web

echo "==> Reloading Nginx"
sudo nginx -t && sudo systemctl reload nginx

echo "===== UPDATE COMPLETE ====="
