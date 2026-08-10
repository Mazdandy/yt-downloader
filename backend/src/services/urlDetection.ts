import { Platform } from "../types.js";

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com", "youtube-nocookie.com"];
const TIKTOK_HOSTS = ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com", "m.tiktok.com"];
const INSTAGRAM_HOSTS = ["instagram.com", "www.instagram.com", "m.instagram.com"];

export function detectPlatform(url: string): Platform | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (YOUTUBE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "youtube";
  if (TIKTOK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "tiktok";
  if (INSTAGRAM_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "instagram";
  return null;
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
  const platform = detectPlatform(trimmed);
  if (!platform) {
    return {
      ok: false,
      error: "Unsupported platform. Supported: YouTube, TikTok, Instagram Reels",
    };
  }
  // PRD FR-04/05/06: require the platform-specific path shapes we promise.
  if (platform === "youtube") {
    const isVideo =
      /^\/(watch|shorts|embed|v|live)(\/|\?|$)/.test(parsed.pathname) ||
      parsed.hostname === "youtu.be";
    if (!isVideo) return { ok: false, error: "Not a valid YouTube video URL" };
  }
  if (platform === "instagram") {
    if (!/^\/reel\//.test(parsed.pathname) && !/^\/reels\//.test(parsed.pathname)) {
      return { ok: false, error: "Not a valid Instagram Reels URL" };
    }
  }
  return { ok: true, platform };
}
