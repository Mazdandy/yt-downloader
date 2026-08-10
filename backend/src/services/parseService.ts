import { ParseResponse, Platform } from "../types.js";
import { fetchMetadata, YtDlpMetadata } from "./ytdlp.js";
import { buildFormats } from "./formatMapper.js";

export function buildParseResponse(
  url: string,
  platform: Platform,
  metadata: YtDlpMetadata
): ParseResponse {
  const { formats, unavailableFormats } = buildFormats(metadata, platform);

  // Pick the best thumbnail: prefer the highest-preference full-size one.
  const thumbnail =
    metadata.thumbnails
      ?.slice()
      .sort((a, b) => (b.preference ?? 0) - (a.preference ?? 0))[0]?.url ||
    metadata.thumbnail ||
    "";

  const subtitles = Object.entries({
    ...metadata.subtitles,
    ...metadata.automatic_captions,
  }).map(([language, tracks]) => ({
    language,
    name: tracks?.[0]?.name || language,
    format: (tracks?.some((t) => t.ext === "srt") ? "srt" : "vtt") as "srt" | "vtt",
    url: tracks?.[0]?.url,
  }));

  return {
    id: metadata.id,
    platform,
    title: metadata.title || "Untitled video",
    author: metadata.uploader || "Unknown",
    duration: metadata.duration ?? 0,
    thumbnail,
    description: metadata.description,
    uploadDate: metadata.upload_date,
    viewCount: metadata.view_count,
    formats,
    unavailableFormats,
    subtitles,
    url,
  };
}
