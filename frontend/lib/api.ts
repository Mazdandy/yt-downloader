/**
 * Backend base URL.
 * - Empty string = same-origin (frontend served behind a reverse proxy that routes
 *   /api to the backend, e.g. Caddy on a VPS). This is the VPS default.
 * - Set NEXT_PUBLIC_API_URL for split deploys (e.g. Vercel frontend + Railway backend).
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
