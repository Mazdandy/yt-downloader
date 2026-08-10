#!/usr/bin/env bash
# ============================================================
# Install or update the systemd services for Vibe Downloader.
# Run after git pull to redeploy:
#   bash deploy/install-services.sh && sudo systemctl restart vdl-backend vdl-frontend
# ============================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/yt-downloader}"
APP_DIR="$(cd "$APP_DIR" && pwd)"
UNIT_DIR="$APP_DIR/deploy/systemd"

echo "Using app dir: $APP_DIR"
[ -d "$UNIT_DIR" ] || { echo "systemd unit dir missing: $UNIT_DIR"; exit 1; }

echo "==> Preparing frontend standalone runtime ..."
# Next.js standalone output needs .next/static + public copied next to server.js
if [ -d "$APP_DIR/frontend/.next/standalone" ]; then
  mkdir -p "$APP_DIR/frontend/.next/standalone/.next"
  cp -r "$APP_DIR/frontend/.next/static" "$APP_DIR/frontend/.next/standalone/.next/static"
  [ -d "$APP_DIR/frontend/public" ] && cp -r "$APP_DIR/frontend/public" "$APP_DIR/frontend/.next/standalone/public"
fi

echo "==> Installing systemd units ..."
sudo mkdir -p /etc/systemd/system
sudo sed -e "s|__APP_DIR__|$APP_DIR|g" -e "s|__USER__|$USER|g" \
  "$UNIT_DIR/vdl-backend.service"  > /etc/systemd/system/vdl-backend.service
sudo sed -e "s|__APP_DIR__|$APP_DIR|g" -e "s|__USER__|$USER|g" \
  "$UNIT_DIR/vdl-frontend.service" > /etc/systemd/system/vdl-frontend.service

echo "==> Enabling + starting services ..."
sudo systemctl daemon-reload
sudo systemctl enable vdl-backend vdl-frontend
sudo systemctl restart vdl-backend vdl-frontend

echo ""
echo "Services installed. Status:"
systemctl --no-pager status vdl-backend vdl-frontend --no-legend 2>/dev/null | grep -E "Active|●" || true
echo ""
echo "Logs: journalctl -u vdl-backend -f   |   journalctl -u vdl-frontend -f"
