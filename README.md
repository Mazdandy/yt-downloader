# Vibe Downloader — Video Downloader

Multi-platform video downloader (YouTube · TikTok · Instagram Reels) built from the
[PRD](./PRD_Video_Downloader.md). Backend is Node.js + Express + TypeScript using
[yt-dlp](https://github.com/yt-dlp/yt-dlp) for extraction. Frontend is Next.js 14.

> **No server storage** — videos are downloaded to a temp file, streamed directly to the
> user's device, then deleted (PRD §9.2 / FR-16).

---

## Project Structure

```
├── backend/                  # Express + TypeScript API (port 8787)
│   └── src/
│       ├── server.ts         # App entry: helmet, CORS, rate limit, routes
│       ├── config.ts         # Env-configurable settings
│       ├── routes/api.ts     # /parse, /download, /status/:id, /cancel/:id, /file/:id
│       ├── services/
│       │   ├── ytdlp.ts      # yt-dlp wrapper (metadata, download, progress, cancel)
│       │   ├── urlDetection.ts
│       │   ├── formatMapper.ts
│       │   ├── parseService.ts
│       │   └── downloadManager.ts  # Queue, concurrency cap 3, retries, cancel
│       └── types.ts
└── frontend/                 # Next.js 14 App Router (port 3000)
    ├── app/
    │   ├── page.tsx          # Paste URL → quality select → progress → history
    │   └── globals.css
    └── lib/
        ├── client.ts         # API client
        └── types.ts
```

## Prerequisites

- **Node.js 20+**
- **yt-dlp** (install via Homebrew: `brew install yt-dlp`)
- **ffmpeg** (recommended for best format compatibility): `brew install ffmpeg`

## Quick Start

```bash
# Terminal 1 — backend
cd backend
NODE_ENV=development npm install
npm run dev                  # http://localhost:8787

# Terminal 2 — frontend
cd frontend
NODE_ENV=development npm install
npm run dev                  # http://localhost:3000
```

> Note: `NODE_ENV=production` in your shell makes npm skip devDependencies.
> Prefix installs with `NODE_ENV=development` if you hit that.

## API

Base URL: `http://localhost:8787/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/parse` | Parse URL → metadata + quality options + subtitles |
| POST | `/download` | Queue a download, returns `{ id }` (202) |
| GET | `/status/:id` | Poll job status / progress |
| DELETE | `/cancel/:id` | Cancel queued or active download |
| GET | `/file/:id` | Stream the finished file (one-shot, deleted after) |
| GET | `/health` | Health check |

### Example

```bash
# 1. Parse
curl -X POST localhost:8787/api/v1/parse \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# 2. Start download (use a formatId from step 1)
curl -X POST localhost:8787/api/v1/download \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","formatId":"18","platform":"youtube","title":"My Video"}'
# → {"id":"<uuid>","status":"downloading"}

# 3. Poll status
curl localhost:8787/api/v1/status/<uuid>

# 4. Download the file to disk
curl -o video.mp4 localhost:8787/api/v1/file/<uuid>
```

## Configuration (backend)

All optional, via env vars (see `backend/.env.example`):

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `8787` | API port |
| `YTDLP_PATH` | `yt-dlp` | Path to the yt-dlp binary |
| `TEMP_DIR` | system tmp | Where temp downloads live (deleted after streaming) |
| `RATE_LIMIT_MAX` | `30` | Requests per IP per hour (PRD §9.2). `0` = disabled (dev) |
| `RATE_LIMIT_WINDOW_MS` | `3600000` | Rate limit window |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `MAX_CONCURRENT_DOWNLOADS` | `3` | Concurrent download cap (PRD FR-13) |

## Deployment

**Important:** this app cannot run on serverless (Vercel Functions, Netlify, Cloudflare
Workers) — the backend spawns `yt-dlp` child processes and writes temp files. It needs a
container/VM host. Three supported paths:

- **Option A — Direct on your VPS (no Docker, recommended)**: systemd services + Caddy.
  Nothing to install besides Node/Python/ffmpeg/Caddy. See below.
- **Option B — All-in-one Docker on your VPS**: `docker-compose up` (see `docker-compose.yml`).
- **Option C — Split**: frontend on Vercel, backend on Railway/Render/Fly.io.

### Option A — VPS deployment without Docker (systemd + Caddy)

This is the simplest if you have a VPS. Everything is scripted in `deploy/`.

Requirements: Ubuntu 22.04/24.04 VPS, a domain pointing to the server IP.

1. **On the server**, clone the repo:
   ```bash
   git clone <your-repo-url> && cd yt-downloader
   ```

2. **Run the setup script** (installs Node 22, Python, ffmpeg, Caddy, yt-dlp; builds both
   apps; writes the Caddyfile; installs and starts the services):
   ```bash
   bash deploy/setup-vps.sh your-domain.com
   ```

3. Visit `https://your-domain.com` — Caddy provisions the HTTPS cert automatically.

That's it. The services are managed by systemd:

```bash
systemctl status vdl-backend vdl-frontend     # check status
journalctl -u vdl-backend -f                  # watch backend logs
journalctl -u vdl-frontend -f                 # watch frontend logs
```

**Updating after a `git pull`:**

```bash
cd backend && NODE_ENV=development npm ci && npm run build
cd ../frontend && NODE_ENV=development npm ci && env -u NODE_ENV npm run build
bash deploy/install-services.sh   # copies static assets + reinstalls/restarts services
```

**How it's wired:** Caddy (`/etc/caddy/Caddyfile`) proxies `/api/*` → `127.0.0.1:8787`
(backend) and everything else → `127.0.0.1:3000` (frontend). Both run under systemd and
restart automatically. Temp downloads go to `/tmp/vdl` and are deleted after streaming.

**Without a domain yet?** Run `bash deploy/setup-vps.sh` with a placeholder, or skip the
Caddy step and access the services directly at `http://<server-ip>:3000`. HTTPS needs a
real domain.

### Option B — All-in-one Docker on your VPS

Requirements: a VPS (any Linux, 1 GB RAM+), Docker + Docker Compose, and a domain name
pointing to the server's IP.

1. **On the server**, clone the repo:
   ```bash
   git clone <your-repo-url> && cd yt-downloader
   ```
2. **Set your domain** in `Caddyfile` (replace `your-domain.com`).
3. **Start everything**:
   ```bash
   docker compose up -d --build
   ```
4. Caddy automatically provisions HTTPS (Let's Encrypt) for your domain. Visit
   `https://your-domain.com` — the frontend and API are served on the same origin
   (frontend `/`, API `/api/*`).

The frontend uses same-origin API paths by default (no `NEXT_PUBLIC_API_URL` needed).
Tune `RATE_LIMIT_MAX` and `CORS_ORIGINS` in `docker-compose.yml` as needed.

**Optional — port 80/443 on a cheap VPS:** if you don't have a domain yet, you can
point the URL bar at the server IP during development, but HTTPS (and thus Caddy) needs
a real domain. For a domain-free trial, run just `docker compose up -d backend frontend`
and visit `http://<server-ip>:3000`.

### Option C — Split deployment (Vercel + Railway/Render/Fly.io)

**Backend** — a `Dockerfile` (with `yt-dlp` + `ffmpeg` baked in) is in `backend/`:

- **Railway**: create a new project → Deploy from repo → root directory `backend`.
  `railway.json` is already present; the Dockerfile is auto-detected.
- **Render**: Blueprint deploy (uses `render.yaml`), or Web Service → Docker → root `backend`.
- **Fly.io**: `fly launch` in `backend/`, Dockerfile is picked up automatically.

Required env vars:

| Var | Recommended value |
|-----|-------------------|
| `CORS_ORIGINS` | your Vercel frontend URL, e.g. `https://vibe-downloader.vercel.app` |
| `PORT` | `8787` (Railway sets it automatically; use `$PORT` binding) |
| `RATE_LIMIT_MAX` | `30` (PRD §9.2) or higher for launch |

After deploy you get a URL like `https://video-downloader-backend.up.railway.app`.
Verify: `curl https://<your-backend>/api/v1/health` → `{"status":"ok"}`.

**Frontend** — Vercel:

1. Push the repo to GitHub, import the `frontend/` directory in Vercel (framework: Next.js).
2. Add the env var **at build time**:
   `NEXT_PUBLIC_API_URL=https://<your-backend-domain>`
3. Deploy. The frontend talks to the backend via `lib/client.ts`.

### Post-deploy checklist

- [ ] `curl <backend>/api/v1/health` returns ok
- [ ] `curl -X POST <backend>/api/v1/parse -H "Content-Type: application/json" -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'` returns metadata
- [ ] Frontend loads and can parse + download a video
- [ ] `CORS_ORIGINS` is locked to your frontend domain (not `*`)

## Design Decisions

- **Pure proxy streaming (no server-side merge).** YouTube's 1080p+ DASH streams are
  video-only/audio-only pairs that need ffmpeg merging server-side. With pass-through,
  only progressive (single-file) and audio-only formats are served; DASH formats are
  returned in `unavailableFormats` and shown as a hint in the UI.
- **One-shot file delivery.** A finished file can be fetched once via `/file/:id`, then
  it's deleted. Refetching returns 404. This honors the "no server storage" requirement.
- **`--print after_move:filepath`** is used to resolve the real output path (yt-dlp may
  alter the filename), which fixed a subtle bug where the stream route 404'd.
- **Cancellation** sends SIGTERM to the yt-dlp child process and cleans up the partial
  temp file.

## Known Limitations (v1)

- TikTok & Instagram extraction depends on yt-dlp working against those platforms from
  your IP; both are aggressive about bot blocking. YouTube is the most reliable.
- Download history is session-only (in-memory) per PRD US-007.
- Rate limiting applies per IP; you'll hit 429 after 30 requests/hour in default config.

## Legal

Downloading content may violate platform ToS or copyright. This tool is for personal
use of content you have rights to. See PRD §13 for full legal considerations.
