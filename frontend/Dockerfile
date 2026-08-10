# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci && npm approve-scripts esbuild 2>/dev/null || true

COPY . .
# VPS mode: same-origin API. Uncomment and set for split deploys.
# ENV NEXT_PUBLIC_API_URL=https://api.yourdomain.com
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
