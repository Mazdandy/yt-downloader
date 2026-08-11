import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { unlink } from "fs";
import { config } from "../config.js";
import { downloadFormat } from "./ytdlp.js";

export type DownloadStatus = "queued" | "downloading" | "finished" | "failed" | "cancelled";

export interface DownloadJob {
  id: string;
  url: string;
  platform: string;
  formatId: string;
  title: string;
  status: DownloadStatus;
  progress: number; // 0..100
  speedBytesPerSec?: number;
  etaSeconds?: number;
  totalBytes?: number;
  downloadedBytes?: number;
  filePath?: string;
  error?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  cancelled: boolean;
}

type JobEvents = {
  update: (job: DownloadJob) => void;
  done: (job: DownloadJob) => void;
};

declare interface DownloadManager {
  on<K extends keyof JobEvents>(event: K, listener: JobEvents[K]): this;
  emit<K extends keyof JobEvents>(event: K, ...args: Parameters<JobEvents[K]>): boolean;
}

/**
 * Tracks download jobs, enforces the concurrency cap (PRD FR-13),
 * and supports cancellation (PRD FR-15/US-006).
 */
class DownloadManager extends EventEmitter {
  private jobs = new Map<string, DownloadJob>();
  private queue: string[] = [];
  private activeCount = 0;

  enqueue(job: DownloadJob): void {
    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    this.emit("update", job);
    this.pump();
  }

  get(id: string): DownloadJob | undefined {
    return this.jobs.get(id);
  }

  list(): DownloadJob[] {
    return [...this.jobs.values()];
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (job.status === "queued") {
      this.queue = this.queue.filter((qid) => qid !== id);
      job.status = "cancelled";
      job.cancelled = true;
      job.finishedAt = Date.now();
      this.emit("update", job);
      this.emit("done", job);
      return true;
    }
    if (job.status === "downloading") {
      // The active child process will be killed; the pump() continuation marks it cancelled.
      job.cancelled = true;
      this.emit("update", job);
      return true;
    }
    return false;
  }

  private async pump(): Promise<void> {
    if (this.activeCount >= config.maxConcurrentDownloads) return;
    const id = this.queue.shift();
    if (!id) return;

    const job = this.jobs.get(id)!;
    if (job.cancelled) {
      this.pump();
      return;
    }

    this.activeCount++;
    job.status = "downloading";
    job.startedAt = Date.now();
    this.emit("update", job);

    try {
      // PRD FR-14: retry up to maxRetries times on transient failures.
      let result: Awaited<ReturnType<typeof downloadFormat>> | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        if (job.cancelled) break;
        if (attempt > 0) {
          job.error = `Retrying (${attempt}/${config.maxRetries})…`;
          this.emit("update", job);
        }
        try {
          result = await downloadFormat(
            job.url,
            job.formatId,
            `${config.tempDir}/vdl-${job.id}-%(title)s.%(ext)s`,
            (p) => {
              if (job.cancelled) return;
              if (p.status === "downloading") {
                job.progress = Math.min(
                  100,
                  Math.max(0, Math.round((p.downloadedBytes / (p.totalBytes || 1)) * 100))
                );
                job.speedBytesPerSec = p.speedBytesPerSec;
                job.etaSeconds = p.etaSeconds;
                job.totalBytes = p.totalBytes;
                job.downloadedBytes = p.downloadedBytes;
                if (p.filename) job.filePath = p.filename;
              }
              this.emit("update", job);
            },
            () => job.cancelled,
            job.platform
          );
          break;
        } catch (err) {
          lastError = err;
          if (job.cancelled) break;
        }
      }

      if (job.cancelled) {
        job.status = "cancelled";
        if (job.filePath) unlink(job.filePath, () => {});
        job.finishedAt = Date.now();
      } else if (result) {
        job.status = "finished";
        job.progress = 100;
        job.filePath = result.filePath;
        job.error = undefined;
        job.finishedAt = Date.now();
      } else {
        job.status = "failed";
        job.error = lastError instanceof Error ? lastError.message : String(lastError);
        job.finishedAt = Date.now();
      }
    } finally {
      this.activeCount--;
      this.emit("update", job);
      this.emit("done", job);
      // Kick off the next queued job.
      setImmediate(() => this.pump());
    }
  }
}

export const downloadManager = new DownloadManager();

export function createJob(input: {
  url: string;
  platform: string;
  formatId: string;
  title: string;
}): DownloadJob {
  return {
    id: randomUUID(),
    url: input.url,
    platform: input.platform,
    formatId: input.formatId,
    title: input.title,
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
    cancelled: false,
  };
}
