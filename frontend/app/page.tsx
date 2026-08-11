"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelDownload,
  downloadUrl,
  getStatus,
  parseUrl,
  queueDownload,
} from "../lib/client";
import {
  HistoryEntry,
  JobStatusResponse,
  ParseResponse,
  VideoFormat,
} from "../lib/types";

const PLATFORM_NAMES: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

function formatDuration(sec: number): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "Unknown size";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function formatSpeed(bytesPerSec?: number): string {
  if (!bytesPerSec) return "";
  const mb = bytesPerSec / (1024 * 1024);
  return `${mb.toFixed(1)} MB/s`;
}

function formatEta(sec?: number): string {
  if (sec == null) return "";
  return `~${sec}s left`;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParseResponse | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const addHistory = useCallback((e: HistoryEntry) => {
    setHistory((prev) => [e, ...prev].slice(0, 20)); // US-007: last 20, session-only
  }, []);

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || parsing) return;
    setError(null);
    setParsing(true);
    setPreview(null);
    setJob(null);
    try {
      const data = await parseUrl(url.trim());
      setPreview(data);
      // US-002: default to highest available quality
      // TikTok/Instagram serve HEVC (h265) streams that browsers can't play;
      // prefer H.264 when a choice exists at the same resolution.
      const isH264 = (f: { codec?: string }) =>
        !f.codec ||
        f.codec.toLowerCase().startsWith("avc") ||
        f.codec.toLowerCase().includes("h264");
      const preferred = (
        a: { codec?: string; height?: number },
        b: { codec?: string; height?: number }
      ) => {
        const aH = isH264(a) ? 1 : 0;
        const bH = isH264(b) ? 1 : 0;
        if (aH !== bH) return bH - aH;
        return (b.height ?? 0) - (a.height ?? 0);
      };
      const defaultFormat =
        data.formats.find((f) => f.kind === "video+audio" && !f.requiresMerge) ||
        [...data.formats].sort(preferred)[0] ||
        null;
      setSelectedFormat(defaultFormat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse URL");
    } finally {
      setParsing(false);
    }
  }

  async function handleDownload() {
    if (!preview || !selectedFormat) return;
    setError(null);
    setDownloading(true);
    setJob({ ...job } as JobStatusResponse);
    try {
      const res = await queueDownload({
        url: preview.url,
        platform: preview.platform,
        formatId: selectedFormat.formatId,
        title: preview.title,
      });
      pollRef.current = setInterval(async () => {
        try {
          const status = await getStatus(res.id);
          setJob(status);
          if (status.status === "finished") {
            stopPolling();
            setDownloading(false);
            addHistory({
              id: res.id,
              thumbnail: preview.thumbnail,
              title: preview.title,
              platform: preview.platform,
              formatLabel: selectedFormat.label,
              timestamp: Date.now(),
            });
          } else if (
            status.status === "failed" ||
            status.status === "cancelled"
          ) {
            stopPolling();
            setDownloading(false);
            setError(status.error || `Download ${status.status}`);
          }
        } catch (err) {
          stopPolling();
          setDownloading(false);
          setError(err instanceof Error ? err.message : "Status check failed");
        }
      }, 1000);
    } catch (err) {
      setDownloading(false);
      setError(err instanceof Error ? err.message : "Failed to start download");
    }
  }

  async function handleCancel() {
    if (!job) return;
    try {
      await cancelDownload(job.id);
    } catch {
      /* best effort */
    }
  }

  function handleReDownload(entry: HistoryEntry) {
    setUrl(entry.title); // placeholder — re-download requires original URL
  }

  const progress = job ? Math.round(job.progress || 0) : 0;

  return (
    <main className="page">
      <header className="header">
        <h1>Vibe Downloader</h1>
        <p>Download videos from YouTube, TikTok &amp; Instagram Reels</p>
        <div className="badges">
          <span className="badge">YouTube</span>
          <span className="badge">TikTok</span>
          <span className="badge">Instagram Reels</span>
        </div>
      </header>

      <section className="hero">
        <form onSubmit={handleParse} className="url-form">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a video URL here…"
            className="url-input"
            aria-label="Video URL"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={parsing || !url.trim()}>
            {parsing ? "Detecting…" : "Get Video"}
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      {preview && (
        <section className="preview">
          <div className="preview-card">
            <div className="preview-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.thumbnail} alt={preview.title} />
              <span className="platform-tag">{PLATFORM_NAMES[preview.platform]}</span>
            </div>
            <div className="preview-info">
              <h2>{preview.title}</h2>
              <p className="meta">
                {preview.author} · {formatDuration(preview.duration)}
                {preview.viewCount ? ` · ${(preview.viewCount / 1e6).toFixed(1)}M views` : ""}
              </p>
              <div className="format-list">
                <h3>Choose quality</h3>
                {preview.formats.map((f) => (
                  <label
                    key={f.formatId}
                    className={`format-option ${
                      selectedFormat?.formatId === f.formatId ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      checked={selectedFormat?.formatId === f.formatId}
                      onChange={() => setSelectedFormat(f)}
                    />
                    <span className="format-label">
                      {f.kind === "audio" ? "🎵" : "🎬"} {f.label}
                      {f.kind === "audio" ? ` (${f.ext.toUpperCase()})` : ""}
                    </span>
                    <span className="format-size">{formatSize(f.fileSize)}</span>
                  </label>
                ))}
              </div>
              {preview.unavailableFormats.length > 0 && (
                <p className="hint">
                  {preview.unavailableFormats.length} higher-quality stream(s)
                  (e.g. 1080p+) need server-side merging and aren&apos;t available in
                  this build.
                </p>
              )}
              <button
                onClick={handleDownload}
                className="btn btn-download"
                disabled={downloading || !selectedFormat}
              >
                {downloading ? "Downloading…" : `Download ${selectedFormat?.label || ""}`}
              </button>
            </div>
          </div>
        </section>
      )}

      {job && (job.status === "queued" || job.status === "downloading") && (
        <section className="progress-card">
          <h3>Downloading…</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-meta">
            <span>{progress}%</span>
            <span>{formatSpeed(job.speedBytesPerSec)}</span>
            <span>{formatEta(job.etaSeconds)}</span>
          </div>
          <button onClick={handleCancel} className="btn btn-cancel">
            Cancel
          </button>
        </section>
      )}

      {job && job.status === "finished" && (
        <section className="success-card">
          <h3>✓ Download ready!</h3>
          <a href={downloadUrl(job.id)} className="btn btn-download">
            Save file ({formatSize(job.totalBytes)})
          </a>
        </section>
      )}

      {history.length > 0 && (
        <section className="history">
          <h3>Recent downloads</h3>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.thumbnail} alt="" width={60} height={40} />
                <div className="history-info">
                  <span className="history-title">{h.title}</span>
                  <span className="history-meta">
                    {PLATFORM_NAMES[h.platform]} · {h.formatLabel} ·{" "}
                    {new Date(h.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <button
                  onClick={() => handleReDownload(h)}
                  className="btn btn-small"
                  disabled
                  title="Re-download needs original URL (v2.0)"
                >
                  ↻
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
