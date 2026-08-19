import type { Platform } from "./types";

export const PLATFORM_NAMES: Record<Platform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  twitter: "Twitter",
  x: "X",
  facebook: "Facebook",
  reddit: "Reddit",
  vimeo: "Vimeo",
  twitch: "Twitch",
  dailymotion: "Dailymotion",
  soundcloud: "SoundCloud",
  other: "Other",
};

/** Platforms the downloader supports — mirrors the `Platform` type in types.ts */
export const SUPPORTED_PLATFORMS = [
  "youtube",
  "tiktok",
  "instagram",
  "twitter",
  "x",
  "facebook",
  "reddit",
  "vimeo",
  "twitch",
  "dailymotion",
  "soundcloud",
  "other",
] as const satisfies readonly Platform[];

// "other" is a fallback bucket, not a real platform — keep it out of SEO copy.
const seoNames = SUPPORTED_PLATFORMS.filter((p) => p !== "other").map(
  (p) => PLATFORM_NAMES[p],
);

/** "YouTube | TikTok | Instagram | …" — for page titles */
export const PLATFORM_TITLE = seoNames.join(" | ");

/** "YouTube, TikTok, Instagram, …" — for descriptions */
export const PLATFORM_DESCRIPTION = seoNames.join(", ");
