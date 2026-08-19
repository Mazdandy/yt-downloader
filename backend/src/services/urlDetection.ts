import { Platform } from "../types.js";

/**
 * Best-effort platform label from the hostname. Not exhaustive by design —
 * yt-dlp supports far more sites than we enumerate here, so anything unknown
 * falls back to "other" and is still accepted. The real gate is yt-dlp
 * itself: if it can extract the URL, we can download it.
 */
const HOST_PLATFORMS: Array<[string, Platform]> = [
  ["youtube.com", "youtube"],
  ["youtu.be", "youtube"],
  ["tiktok.com", "tiktok"],
  ["instagram.com", "instagram"],
  ["twitter.com", "twitter"],
  ["x.com", "x"],
  ["facebook.com", "facebook"],
  ["fb.watch", "facebook"],
  ["reddit.com", "reddit"],
  ["vimeo.com", "vimeo"],
  ["twitch.tv", "twitch"],
  ["dailymotion.com", "dailymotion"],
  ["soundcloud.com", "soundcloud"],
];

export function detectPlatform(url: string): Platform {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "other";
  }
  for (const [suffix, platform] of HOST_PLATFORMS) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return platform;
  }
  return "other";
}

/** PRD FR-02: validate URL format before making API calls */
export function validateUrl(url: string): { ok: true; platform: Platform } | { ok: false; error: string } {
  if (!url || url.trim().length === 0) {
    return { ok: false, error: "URL is required" };
  }
  const trimmed = url.trim();
  if (trimmed.length > 2048) {
    return { ok: false, error: "URL is too long" };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "URL must use http or https" };
  }
  if (!parsed.hostname.includes(".")) {
    return { ok: false, error: "URL must be a valid web address" };
  }
  // No platform allowlist: any http(s) URL is passed to yt-dlp, which decides
  // whether it can extract it. This opens up every site yt-dlp supports.
  return { ok: true, platform: detectPlatform(trimmed) };
}
