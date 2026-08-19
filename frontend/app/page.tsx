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
import { PLATFORM_NAMES, SUPPORTED_PLATFORMS } from "../lib/platforms";

const PLATFORM_META: Record<
  string,
  { icon: string; iconClass: string; chipClass: string }
> = {
  youtube: {
    icon: "play_circle",
    iconClass: "text-youtube-red",
    chipClass: "bg-error-container text-on-error-container",
  },
  tiktok: {
    icon: "music_note",
    iconClass: "text-tiktok-magenta",
    chipClass: "bg-on-surface text-surface-container-lowest",
  },
  instagram: {
    icon: "photo_camera",
    iconClass: "text-on-primary",
    chipClass: "bg-gradient-to-tr from-instagram-gradient-start to-instagram-gradient-end text-on-primary",
  },
  twitter: {
    icon: "chat",
    iconClass: "text-secondary",
    chipClass: "bg-secondary-fixed text-on-secondary-fixed",
  },
  x: {
    icon: "close",
    iconClass: "text-on-surface",
    chipClass: "bg-surface-dim text-on-surface",
  },
  facebook: {
    icon: "thumb_up",
    iconClass: "text-tertiary",
    chipClass: "bg-tertiary-container text-on-tertiary-container",
  },
  reddit: {
    icon: "forum",
    iconClass: "text-error-red",
    chipClass: "bg-error-container text-on-error-container",
  },
  vimeo: {
    icon: "movie",
    iconClass: "text-primary",
    chipClass: "bg-primary-fixed text-on-primary-fixed",
  },
  twitch: {
    icon: "live_tv",
    iconClass: "text-secondary-fixed",
    chipClass: "bg-secondary text-on-secondary",
  },
  dailymotion: {
    icon: "smart_display",
    iconClass: "text-tertiary",
    chipClass: "bg-tertiary-fixed text-on-tertiary-fixed",
  },
  soundcloud: {
    icon: "graphic_eq",
    iconClass: "text-warning-amber",
    chipClass: "bg-tertiary-container text-on-tertiary-container",
  },
  other: {
    icon: "link",
    iconClass: "text-on-surface-variant",
    chipClass: "bg-surface-variant text-on-surface",
  },
};

/** Meta for a platform, falling back to the generic "other" for unknown sites. */
function platformMeta(p: string) {
  return PLATFORM_META[p] || PLATFORM_META.other;
}

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

/** Material Symbols icon helper */
function Icon({
  name,
  filled = false,
  className = "",
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

/** Brand mark: cloud + download arrow, the LOTC logo. */
function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <path
        d="M46 54H20C12.82 54 7 48.18 7 41c0-5.78 3.9-10.64 9.2-12.16A16 16 0 0 1 40 19.6 14 14 0 0 1 50.6 28.9C55.94 30.3 60 34.98 60 40.6 60 47.4 53.74 54 46 54Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 46V24M24.5 39.5 32 47l7.5-7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

  const progress = job ? Math.round(job.progress || 0) : 0;
  const isActiveJob =
    !!job && (job.status === "queued" || job.status === "downloading");

  return (
    <main className="page min-h-screen flex flex-col">
      {/* ===== TopAppBar (mobile) ===== */}
      <header className="fixed top-0 flex justify-between items-center w-full px-container-margin py-stack-sm bg-surface z-40">
        <button
          aria-label="Home"
          className="w-[48px] h-[48px] flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 text-primary"
        >
          <BrandMark className="w-7 h-7" />
        </button>
        <h1 className="font-headline-md text-headline-md font-bold text-primary">
          LOTC
        </h1>
        <button
          aria-label="Account"
          className="w-[48px] h-[48px] flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 text-primary"
        >
          <Icon name="account_circle" className="text-2xl" />
        </button>
      </header>

      {/* ===== Main Canvas ===== */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-container-margin pt-[72px] pb-[110px] relative">
        {/* Ambient glow (mobile home) */}
        <div className="ambient-glow" />

        {/* ===== Hero / URL Input ===== */}
        <section className="mt-stack-md flex flex-col gap-stack-sm animate-fade-in relative z-10">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface md:text-headline-lg md:font-headline-lg text-center md:mt-6">
            Download any video.
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-2 text-center max-w-md mx-auto break-words">
            Paste a link to get started — fast, reliable, no watermarks.
          </p>
          <form
            onSubmit={handleParse}
            className="relative w-full group max-w-2xl mx-auto"
          >
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste link here…"
              aria-label="Video URL"
              required
              className="w-full h-touch-target-min pl-4 pr-[100px] rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md font-body-md text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
            />
            <button
              type="submit"
              disabled={parsing || !url.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary-container text-on-primary-container h-9 px-4 rounded-md font-label-md text-label-md hover:bg-primary hover:text-on-primary transition-colors active:scale-95 flex items-center justify-center disabled:opacity-60"
            >
              {parsing ? "Detecting…" : "Get Video"}
            </button>
          </form>
          {error && (
            <p
              className="text-error text-label-md font-label-md text-center mx-auto max-w-md"
              role="alert"
            >
              {error}
            </p>
          )}
        </section>

        {/* ===== Supported Platforms ===== */}
        <section className="mt-stack-lg relative z-10">
          <h2 className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-stack-sm text-center md:text-left md:max-w-2xl md:mx-auto">
            Supported Platforms
          </h2>
          <div className="grid grid-cols-3 gap-gutter max-w-full w-full mx-auto">
            {SUPPORTED_PLATFORMS.map((p) => {
              const meta = platformMeta(p);
              return (
                <div
                  key={p}
                  className="bg-surface-container-lowest rounded-xl p-3 flex flex-col items-center justify-center gap-2 border border-surface-variant shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${meta.chipClass}`}
                  >
                    <Icon
                      name={meta.icon}
                      filled
                      className={`text-[20px] ${meta.iconClass}`}
                    />
                  </div>
                  <span className="font-mono-label text-mono-label text-on-surface-variant">
                    {PLATFORM_NAMES[p]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== Preview / Quality Selection ===== */}
        {preview && (
          <section className="mt-stack-lg relative z-10">
            <div className="max-w-5xl mx-auto bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden flex flex-col lg:flex-row">
              {/* Left: video preview */}
              <div className="w-full lg:w-1/2 p-stack-lg bg-surface-container-low flex flex-col justify-center items-center border-b lg:border-b-0 lg:border-r border-outline-variant">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-sm border border-outline-variant bg-surface-container">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.thumbnail}
                    alt={preview.title}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className={`absolute top-2 left-2 h-8 w-8 rounded-full flex items-center justify-center shadow-sm ${platformMeta(preview.platform).chipClass}`}
                  >
                    <Icon
                      name={platformMeta(preview.platform).icon}
                      filled
                      className={`text-[20px] ${platformMeta(preview.platform).iconClass}`}
                    />
                  </span>
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white font-mono-label text-mono-label px-2 py-1 rounded">
                    {formatDuration(preview.duration)}
                  </span>
                </div>
                <div className="mt-stack-md w-full text-left">
                  <h3 className="font-headline-md text-headline-md text-on-surface line-clamp-2">
                    {preview.title}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    {preview.author}
                    {preview.viewCount
                      ? ` · ${(preview.viewCount / 1e6).toFixed(1)}M views`
                      : ""}
                  </p>
                </div>
              </div>

              {/* Right: download options */}
              <div className="w-full lg:w-1/2 p-stack-lg flex flex-col">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-lg border-b border-outline-variant pb-2">
                  Download Options
                </h3>

                {preview.formats.length > 0 ? (
                  <div className="mb-stack-lg">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-stack-sm">
                      Video Quality
                    </label>
                    <div className="flex flex-col gap-2">
                      {preview.formats.map((f) => (
                        <label
                          key={f.formatId}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer min-h-touch-target-min transition-colors ${
                            selectedFormat?.formatId === f.formatId
                              ? "border-primary bg-primary/5"
                              : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedFormat?.formatId === f.formatId
                                  ? "border-primary"
                                  : "border-outline-variant"
                              }`}
                            >
                              {selectedFormat?.formatId === f.formatId && (
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-label-md text-label-md text-on-surface">
                                {f.kind === "audio" ? "🎵" : "🎬"} {f.label}
                                {f.kind === "audio"
                                  ? ` (${f.ext.toUpperCase()})`
                                  : ""}
                              </span>
                              <span className="font-label-sm text-label-sm text-secondary">
                                {f.codec || f.ext.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono-label text-mono-label text-secondary">
                            {formatSize(f.fileSize)}
                          </span>
                          <input
                            type="radio"
                            name="format"
                            className="sr-only"
                            checked={selectedFormat?.formatId === f.formatId}
                            onChange={() => setSelectedFormat(f)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="font-body-md text-body-md text-on-surface-variant mb-stack-lg">
                    No downloadable formats found for this video.
                  </p>
                )}

                {preview.unavailableFormats.length > 0 && (
                  <p className="font-label-sm text-label-sm text-secondary mb-stack-lg">
                    {preview.unavailableFormats.length} higher-quality
                    stream(s) need server-side merging and aren&apos;t available
                    in this build.
                  </p>
                )}

                {/* Primary action */}
                <div className="mt-auto pt-stack-md">
                  <button
                    onClick={handleDownload}
                    disabled={downloading || !selectedFormat}
                    className="w-full bg-primary text-on-primary h-touch-target-min rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-60"
                  >
                    <Icon name="download" filled />
                    {downloading
                      ? "Downloading…"
                      : `Start Download${
                          selectedFormat ? ` (${selectedFormat.label})` : ""
                        }`}
                  </button>
                  <p className="text-center font-label-sm text-label-sm text-on-surface-variant mt-2">
                    By downloading, you agree to our Terms of Service.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== Progress / Active Download ===== */}
        {isActiveJob && (
          <section className="mt-stack-lg relative z-10">
            <div className="max-w-5xl mx-auto bg-surface-container-lowest rounded-xl p-stack-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-surface-container relative overflow-hidden">
              <div className="flex gap-4 mb-4">
                {preview?.thumbnail && (
                  <div className="relative w-24 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container shadow-inner hidden sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface line-clamp-2 mb-1">
                      {job?.title || "Downloading…"}
                    </h3>
                    <p className="font-label-sm text-label-sm text-secondary">
                      {PLATFORM_NAMES[job?.platform || "youtube"] || "Video"} ·{" "}
                      {job?.formatId}
                    </p>
                  </div>
                  <div className="flex items-center justify-between font-mono-label text-mono-label mt-2">
                    <span className="text-primary font-bold">
                      {job?.phase === "converting"
                        ? "Converting…"
                        : `${progress}%`}
                    </span>
                    <span className="text-secondary">
                      {job?.phase === "converting"
                        ? "Preparing video…"
                        : job?.downloadedBytes !== undefined
                          ? `${formatSize(job.downloadedBytes)} / ${formatSize(job.totalBytes)}`
                          : ""}
                    </span>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden mb-4 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute top-0 left-0 h-[2px] bg-white/30 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center mb-stack-md border-t border-surface-variant pt-3">
                <div className="flex items-center gap-1.5 text-secondary">
                  <Icon name="speed" className="text-[18px]" />
                  <span className="font-label-sm text-label-sm">
                    {formatSpeed(job?.speedBytesPerSec)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-secondary">
                  <Icon name="schedule" className="text-[18px]" />
                  <span className="font-label-sm text-label-sm">
                    {formatEta(job?.etaSeconds)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="w-full h-[48px] rounded-lg border border-outline text-secondary font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-surface-container-low hover:text-on-surface transition-colors active:scale-[0.98]"
              >
                <Icon name="close" className="text-[20px]" />
                Cancel Download
              </button>
            </div>
          </section>
        )}

        {/* ===== Success ===== */}
        {job && job.status === "finished" && (
          <section className="mt-stack-lg relative z-10">
            <div className="max-w-5xl mx-auto bg-surface-container-lowest rounded-xl p-stack-lg shadow-sm border border-outline-variant flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-success-green/15 flex items-center justify-center text-success-green">
                <Icon name="check_circle" filled className="text-[32px]" />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Download ready!
              </h3>
              <a
                href={downloadUrl(job.id)}
                className="inline-flex items-center gap-2 bg-primary text-on-primary h-touch-target-min px-6 rounded-lg font-label-md text-label-md hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
              >
                <Icon name="save_alt" />
                Save file ({formatSize(job.totalBytes)})
              </a>
            </div>
          </section>
        )}

        {/* ===== Empty state tips (shown before parse) ===== */}
        {!preview && !isActiveJob && (
          <section className="mt-stack-lg flex-1 flex flex-col relative z-10">
            <div className="max-w-2xl mx-auto w-full bg-surface-container-lowest/80 backdrop-blur-md rounded-xl p-stack-lg flex flex-col items-center border border-surface-variant shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
              <div className="w-16 h-16 mb-stack-md rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <Icon name="bolt" className="text-[32px]" />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-1">
                Fast &amp; Reliable
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant text-center mb-stack-lg max-w-[260px]">
                Extract high-quality video and audio in seconds. No watermarks,
                no hassle.
              </p>
              <div className="w-full space-y-2">
                {[
                  { icon: "content_copy", text: "Copy link from app" },
                  { icon: "auto_awesome", text: "Paste to process" },
                  { icon: "download", text: "Save to device" },
                ].map((step) => (
                  <div
                    key={step.text}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low border border-surface-container-high transition-colors hover:bg-surface-container"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                      <Icon name={step.icon} className="text-[18px]" />
                    </div>
                    <span className="font-body-md text-body-md text-on-surface">
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ===== History ===== */}
        {history.length > 0 && (
          <section className="mt-stack-lg relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="mb-2 flex justify-between items-end">
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
                  Recent downloads
                </h2>
                <span className="font-label-md text-label-md text-secondary">
                  {history.length} items
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {history.map((h) => (
                  <article
                    key={h.id}
                    className="bg-surface-container-lowest rounded-xl p-3 flex gap-4 shadow-[0_2px_4px_rgba(0,0,0,0.04)] border border-outline-variant"
                  >
                    <div className="relative w-20 h-14 shrink-0 rounded-lg overflow-hidden bg-surface-container-high sm:w-24 sm:h-16">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={h.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h3 className="font-label-md text-label-md text-on-surface line-clamp-2 mb-1">
                          {h.title}
                        </h3>
                        <div className="flex items-center gap-2 font-label-sm text-label-sm text-outline">
                          <span className="bg-surface-container py-0.5 px-2 rounded-full font-mono-label text-mono-label text-on-surface-variant">
                            {h.formatLabel}
                          </span>
                          <span>•</span>
                          <span>{PLATFORM_NAMES[h.platform] || "Other"}</span>
                          <span>•</span>
                          <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      aria-label="Re-download"
                      disabled
                      title="Re-download needs original URL (v2.0)"
                      className="h-8 w-8 shrink-0 border border-outline-variant text-secondary rounded-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
                    >
                      <Icon name="refresh" className="text-[16px]" />
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ===== Disclaimer ===== */}
        <footer className="mt-stack-lg relative z-10">
          <div className="max-w-5xl mx-auto px-4 py-6 border-t border-surface-variant">
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
              <span className="font-semibold text-on-surface">Disclaimer:</span>{" "}
              This tool is provided for personal use only. Only download content
              that you own or have explicit permission to download. The
              platform names (YouTube, TikTok, Instagram) are trademarks of
              their respective owners. This website is not affiliated with,
              endorsed by, or sponsored by YouTube, TikTok, or Instagram.
              Downloading copyrighted content without permission may violate
              applicable laws and the platforms&apos; Terms of Service.
            </p>
          </div>
        </footer>
      </div>

      {/* ===== BottomNavBar (mobile) ===== */}
      <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-surface shadow-[0_-2px_10px_rgba(0,0,0,0.05)] rounded-t-xl pb-safe">
        {/* Home (Active) */}
        <span className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1 transition-all duration-200 min-w-[64px] min-h-[48px]">
          <Icon name="home" filled />
          <span className="font-label-sm text-label-sm mt-0.5 font-semibold">
            Home
          </span>
        </span>
        {/* History (Inactive) */}
        <span className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 rounded-full transition-all duration-200 min-w-[64px] min-h-[48px]">
          <Icon name="history" />
          <span className="font-label-sm text-label-sm mt-0.5">History</span>
        </span>
        {/* Settings (Inactive) */}
        <span className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 rounded-full transition-all duration-200 min-w-[64px] min-h-[48px]">
          <Icon name="settings" />
          <span className="font-label-sm text-label-sm mt-0.5">Settings</span>
        </span>
      </nav>
    </main>
  );
}
