# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Need devDependencies (typescript, tsx) to compile — set NODE_ENV=development.
# npm may block esbuild's postinstall by default; approve it so tsx works.
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci && npm approve-scripts esbuild 2>/dev/null || true

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine
WORKDIR /app

# yt-dlp is a Python tool; alpine ships python3. ffmpeg covers format fallbacks.
RUN apk add --no-cache python3 ffmpeg \
  && pip3 install --no-cache-dir --break-system-packages yt-dlp \
  && yt-dlp --version

ENV NODE_ENV=production
ENV PORT=8787

# Runtime only needs prod deps. Use --ignore-scripts: esbuild isn't needed at runtime.
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8787/api/v1/health || exit 1

# Temp files live here and are deleted after streaming.
# Mount a volume here if you want a specific disk (Railway/Fly persistent volume).
ENV TEMP_DIR=/tmp/vdl
RUN mkdir -p /tmp/vdl

CMD ["node", "dist/server.js"]
