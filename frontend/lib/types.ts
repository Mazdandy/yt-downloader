export type Platform = "youtube" | "tiktok" | "instagram";

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

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  progress: number;
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
