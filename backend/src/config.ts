export const config = {
  port: parseInt(process.env.PORT || "8787", 10),
  ytdlpPath: process.env.YTDLP_PATH || "yt-dlp",
  // Files are streamed to the client and temp files are deleted after — nothing persists.
  tempDir: process.env.TEMP_DIR || require("os").tmpdir(),
  maxConcurrentDownloads: 3,
  maxRetries: 3,
  // HEVC→H.264 conversion can take a while on slow VPS CPUs; anything past
  // this is treated as a failure so the job doesn't hang forever.
  transcodeTimeoutMs: parseInt(
    process.env.TRANSCODE_TIMEOUT_MS || (120 * 1000).toString(),
    10
  ),
  // PRD §9.2: 30 requests per IP per hour.
  // Set RATE_LIMIT_MAX=0 to disable (development only).
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || (60 * 60 * 1000).toString(), 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "30", 10),
  },
  corsOrigins: (process.env.CORS_ORIGINS || "*").split(","),
};
