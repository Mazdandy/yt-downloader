import { VideoFormat, Platform } from "../types.js";
import { YtDlpMetadata } from "./ytdlp.js";

interface RawFormat {
  format_id: string;
  ext?: string;
  height?: number;
  width?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
  abr?: number;
  format_note?: string;
}

/**
 * Map a yt-dlp format entry to our public VideoFormat shape.
 * Since we use a pure proxy (no server-side merge), formats that only carry
 * video OR only carry audio are flagged `requiresMerge: true` so the client
 * can hide them (except audio-only, which we can serve as-is for MP3/M4A).
 */
function mapFormat(f: RawFormat, platform: Platform): VideoFormat {
  const isVideo = !!f.vcodec && f.vcodec !== "none";
  const isAudio = !!f.acodec && f.acodec !== "none";
  const height = f.height ?? undefined;

  let label: string;
  if (isAudio && !isVideo) {
    label = f.ext === "m4a" ? "M4A" : f.ext === "webm" ? "OPUS" : "MP3";
  } else {
    label = height ? `${height}p` : f.format_note || f.format_id;
  }

  const codec = [isVideo ? f.vcodec : null, isAudio ? f.acodec : null]
    .filter(Boolean)
    .join(" / ");

  return {
    formatId: f.format_id,
    label,
    kind: isVideo && isAudio ? "video+audio" : isVideo ? "video" : "audio",
    height,
    width: f.width,
    fps: f.fps,
    audioBitrate: f.abr ? Math.round(f.abr) : undefined,
    fileSize: f.filesize ?? f.filesize_approx,
    ext: f.ext || "mp4",
    codec: codec || undefined,
    requiresMerge: (isVideo !== isAudio) && !isAudio,
  };
}

/**
 * Build the downloadable-format list for a platform.
 * Rules:
 * - YouTube: progressive formats (video+audio, mp4) + audio-only (mp3/m4a).
 *   DASH video-only streams (which need server merging) go to unavailableFormats.
 * - TikTok/Instagram: single progressive streams; expose by height.
 */
export function buildFormats(
  metadata: YtDlpMetadata,
  platform: Platform
): { formats: VideoFormat[]; unavailableFormats: VideoFormat[] } {
  const raw = metadata.formats ?? [];
  const available: VideoFormat[] = [];
  const unavailable: VideoFormat[] = [];

  for (const f of raw) {
    // Skip storyboards / image-sprite formats (mhtml) and anything without a URL.
    if (!f.format_id || f.format_id.startsWith("sb")) continue;
    if (!f.url) continue;

    const vf = mapFormat(f, platform);

    if (platform === "youtube") {
      // Audio-only (m4a/mp3/webm audio) — usable as-is.
      if (vf.kind === "audio") {
        // Prefer formats we can actually transcode to MP3? We don't transcode in proxy
        // mode; serve native m4a/webm audio. Mark everything available.
        available.push(vf);
        continue;
      }
      // video+audio progressive formats (e.g. 18=360p, 22=720p, 37=1080p)
      if (vf.kind === "video+audio") {
        available.push(vf);
        continue;
      }
      // DASH video-only — cannot be played standalone.
      unavailable.push(vf);
      continue;
    }

    // TikTok / Instagram: everything is single-file progressive.
    // Prefer H.264 (h264_*) over HEVC/H.265 (bytevc1_*) — HEVC inside an .mp4
    // is not playable in most browsers, which surfaces as audio + blank video.
    if (platform === "tiktok" || platform === "instagram") {
      const vcodec = (f.vcodec || "").toLowerCase();
      if (vcodec.startsWith("avc") || vcodec === "h264") {
        available.push(vf);
      } else if (vf.kind === "audio") {
        available.push(vf); // keep audio-only streams
      } else if (!available.some((a) => a.height === vf.height && a.kind === vf.kind)) {
        // Fall back to HEVC only when no H.264 stream exists at that resolution.
        available.push(vf);
      }
      continue;
    }

    // All other platforms (twitter/x, facebook, reddit, vimeo, twitch, ...):
    // behave like YouTube — keep progressive (video+audio) and audio-only
    // formats, hide video-only streams that need server-side merging.
    if (vf.kind === "audio") {
      available.push(vf);
    } else if (vf.kind === "video+audio") {
      available.push(vf);
    } else {
      unavailable.push(vf);
    }
  }

  // De-duplicate by (label + kind) keeping the largest height / bitrate.
  const seen = new Map<string, VideoFormat>();
  for (const f of available) {
    const key = `${f.kind}:${f.ext}:${f.label}`;
    const existing = seen.get(key);
    if (!existing || (f.fileSize ?? 0) > (existing.fileSize ?? 0)) {
      seen.set(key, f);
    }
  }

  const sortKey = (f: VideoFormat) => f.kind === "audio" ? -1 : (f.height ?? 0);

  const result = [...seen.values()].sort((a, b) => {
    const audioDiff = Number(a.kind === "audio") - Number(b.kind === "audio");
    if (audioDiff !== 0) return audioDiff;
    return sortKey(b) - sortKey(a);
  });

  const unavailableDeduped = [...new Map(unavailable.map((f) => [f.formatId, f])).values()];

  return { formats: result, unavailableFormats: unavailableDeduped };
}
