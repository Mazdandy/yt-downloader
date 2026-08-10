#!/usr/bin/env bash
# ============================================================
# Vibe Downloader — VPS setup (no Docker)
# Tested on Ubuntu 22.04/24.04. Run as a normal user with sudo.
#   usage: bash deploy/setup-vps.sh your-domain.com
# ============================================================
set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: bash deploy/setup-vps.sh <your-domain.com>"
  echo "  (DNS A record must already point at this server)"
  exit 1
fi

APP_DIR="${APP_DIR:-$HOME/yt-downloader}"

echo "==> 1/6 Installing system packages (node 22, python3, ffmpeg, git, caddy)..."
# NodeSource repo for a current Node
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
fi
sudo apt-get update -y
sudo apt-get install -y nodejs python3 python3-pip ffmpeg git

# Caddy web server (reverse proxy + automatic HTTPS)
if ! command -v caddy >/dev/null 2>&1; then
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y caddy
fi

echo "==> 2/6 Installing yt-dlp (Python)..."
pip3 install --user --upgrade yt-dlp
# Make sure ~/.local/bin is on PATH for this session and future shells
export PATH="$HOME/.local/bin:$PATH"
grep -q '.local/bin' "$HOME/.bashrc" 2>/dev/null || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"

echo "==> 3/6 Building backend..."
cd "$APP_DIR/backend"
NODE_ENV=development npm ci
npm run build

echo "==> 4/6 Building frontend..."
cd "$APP_DIR/frontend"
NODE_ENV=development npm ci
# Same-origin API (frontend and backend behind the same Caddy domain)
# NEXT_PUBLIC_API_URL is not set -> lib/api.ts uses relative /api paths
env -u NODE_ENV npm run build

echo "==> 5/6 Writing Caddyfile for $DOMAIN..."
sudo tee /etc/caddy/Caddyfile >/dev/null <<CADDY
$DOMAIN {
	encode gzip

	handle /api/* {
		reverse_proxy 127.0.0.1:8787
	}
	handle {
		reverse_proxy 127.0.0.1:3000
	}
}
CADDY
sudo systemctl reload caddy

echo "==> 6/6 Installing systemd services..."
APP_DIR="$APP_DIR" bash deploy/install-services.sh

echo ""
echo "Done! Services:"
systemctl --no-pager status vdl-backend vdl-frontend --no-legend 2>/dev/null | grep -E "Active|●" || true
echo ""
echo "Visit: https://$DOMAIN"
echo "(Caddy provisions the HTTPS cert automatically on first request)"
