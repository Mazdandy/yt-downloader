export type Platform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "twitter"
  | "x"
  | "facebook"
  | "reddit"
  | "vimeo"
  | "twitch"
  | "dailymotion"
  | "soundcloud"
  | "other";

export interface VideoFormat {
  formatId: string;
  label: string;
  kind: "video" | "audio" | "video+audio";
  height?: number;
  width?: number;
  fps?: number;
  audioBitrate?: number;
  fileSize?: number;
  ext: string;
  codec?: string;
  requiresMerge: boolean;
}

export interface SubtitleTrack {
  language: string;
  name: string;
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
  formats: VideoFormat[];
  unavailableFormats: VideoFormat[];
  subtitles: SubtitleTrack[];
  url: string;
}

export type JobStatus =
  | "queued"
  | "downloading"
  | "finished"
  | "failed"
  | "cancelled";

/** What stage of the pipeline a job is in: still downloading or converting codecs. */
export type DownloadPhase = "downloading" | "converting";

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  progress: number;
  phase?: DownloadPhase;
  speedBytesPerSec?: number;
  etaSeconds?: number;
  totalBytes?: number;
  downloadedBytes?: number;
  title: string;
  platform: Platform;
  formatId: string;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  thumbnail: string;
  title: string;
  platform: Platform;
  formatLabel: string;
  timestamp: number;
}
