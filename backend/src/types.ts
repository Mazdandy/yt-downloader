export type Platform = "youtube" | "tiktok" | "instagram";

export interface VideoFormat {
  /** yt-dlp format id, e.g. "18", "22", "137", "bestaudio" */
  formatId: string;
  /** Display label: "1080p", "720p", "MP3", "M4A", ... */
  label: string;
  /** MIME / container type: "video" | "audio" | "video+audio" */
  kind: "video" | "audio" | "video+audio";
  /** Video height (px), if a video stream */
  height?: number;
  /** Video width (px), if a video stream */
  width?: number;
  /** Video FPS, if known */
  fps?: number;
  /** Audio bitrate in kbps, if known */
  audioBitrate?: number;
  /** Approximate file size in bytes (may be null) */
  fileSize?: number;
  /** Container: mp4, webm, m4a, mp3, ... */
  ext: string;
  /** Codec summary: "H.264 / AAC", "VP9 / Opus", ... */
  codec?: string;
  /** True if this format needs server-side merging (DASH video-only/audio-only pairs) */
  requiresMerge: boolean;
}

export interface SubtitleTrack {
  language: string;
  name: string;
  /** "srt" | "vtt" */
  format: "srt" | "vtt";
  url?: string;
}

export interface ParseResponse {
  id: string;
  platform: Platform;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  description?: string;
  uploadDate?: string;
  viewCount?: number;
  /** Formats we can serve via a single stream (no server-side merge). */
  formats: VideoFormat[];
  /** Formats we cannot serve without server-side merging (YouTube DASH). */
  unavailableFormats: VideoFormat[];
  subtitles: SubtitleTrack[];
  url: string;
}
