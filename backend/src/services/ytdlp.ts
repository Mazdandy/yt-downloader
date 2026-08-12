import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { rename, unlink } from "fs/promises";
import { config } from "../config.js";

const execFileAsync = promisify(execFile);

/**
 * Raw metadata shape returned by `yt-dlp -J`.
 * Only the fields we use are typed; the rest is dynamic JSON.
 */
export interface YtDlpMetadata {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; preference?: number; id?: string }>;
  uploader?: string;
  upload_date?: string;
  view_count?: number;
  webpage_url?: string;
  formats?: Array<{
    format_id: string;
    ext?: string;
    url?: string;
    protocol?: string;
    height?: number;
    width?: number;
    fps?: number;
    tbr?: number;
    vcodec?: string;
    acodec?: string;
    filesize?: number;
    filesize_approx?: number;
    format_note?: string;
    vbr?: number;
    abr?: number;
  }>;
  subtitles?: Record<
    string,
    Array<{ ext?: string; url?: string; name?: string }>
  >;
  automatic_captions?: Record<
    string,
    Array<{ ext?: string; url?: string; name?: string }>
  >;
}

export interface YtDlpDownloadInfo {
  filePath: string;
  formatId: string;
}

export interface DownloadProgress {
  status: "downloading" | "finished";
  downloadedBytes: number;
  totalBytes?: number;
  speedBytesPerSec?: number;
  etaSeconds?: number;
  filename?: string;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

const COMMON_ARGS = [
  "--no-playlist",
  "--no-warnings",
  "--no-color",
  "--restrict-filenames",
  "--no-cache-dir",
];

/**
 * Resolve the real video metadata + formats for a URL.
 * `-J` dumps the info JSON to stdout without downloading anything.
 *
 * Retries on transient yt-dlp failures — YouTube/TikTok extraction is
 * occasionally flaky and fails with "Requested format is not available" or
 * "Unable to extract ..." even for valid public videos. A re-run usually
 * succeeds (yt-dlp caches part of the extraction between attempts).
 */
export async function fetchMetadata(url: string): Promise<YtDlpMetadata> {
  const maxAttempts = config.maxRetries + 1;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { stdout } = await execFileAsync(
        config.ytdlpPath,
        [...COMMON_ARGS, "-J", url],
        {
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30_000,
        }
      );
      return JSON.parse(stdout) as YtDlpMetadata;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts && isRetryableYtDlpError(err)) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Transient yt-dlp failures worth retrying (extractor hiccups, missing format
 * on a fresh run, etc.). Non-retryable errors like "Video unavailable",
 * "Private video", or "Unsupported URL" fail fast.
 */
function isRetryableYtDlpError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
  const transient = [
    "requested format is not available",
    "unable to extract",
    "unable to download",
    "this video is unavailable",
    "http error",
    "temporary",
    "timed out",
    "timeout",
    "econnrefused",
    "econnreset",
    "etimedout",
    "eai_again",
  ];
  const lower = msg.toLowerCase();
  return transient.some((t) => lower.includes(t));
}

/**
 * Download a specific format to a temp file, then resolve its final path.
 * yt-dlp writes a `.part` file while transferring and `--continue` makes a
 * retry resume from where it left off instead of re-downloading from zero.
 * Pass an `onCancel` callback (e.g. from the job manager) to abort the child process.
 *
 * The format selector falls back to `best` when the requested id is gone
 * (ephemeral TikTok/Instagram ids, or yt-dlp version drift between parse and
 * download) so we don't hard-fail with "Requested format is not available".
 */
export async function downloadFormat(
  url: string,
  formatId: string,
  outTemplate: string,
  onProgress?: ProgressCallback,
  onCancel?: () => boolean,
  platform?: string
): Promise<YtDlpDownloadInfo> {
  const args = [
    ...COMMON_ARGS,
    "-f",
    `${formatId}/best`,
    // Resume a partially-downloaded `.part` on retries (yt-dlp default is
    // --continue; we spell it out so the intent is visible).
    "--continue",
    "-o",
    outTemplate,
  ];

  // Only TikTok/Instagram ever ship HEVC (bytevc1_*) streams. We detect it from
  // the downloaded file with ffprobe rather than a second yt-dlp -J call, so
  // the common path (YouTube, or H.264 TikTok) adds zero extra latency.
  const checkHEVC = platform === "tiktok" || platform === "instagram";

  if (onProgress) {
    args.push("--newline", "--progress");
  }

  const child = execFile(config.ytdlpPath, [...args, url], {
    maxBuffer: 10 * 1024 * 1024,
  });

  let stderrBuf = "";
  let lastProgress = 0;
  let destinationPath: string | null = null;

  // yt-dlp prints progress + errors to stderr, but the "[download]
  // Destination:" line goes to stdout. Listen on both so we capture the real
  // output path without a second yt-dlp invocation.
  const onStdout = (chunk: Buffer) => {
    const text = chunk.toString();
    const destMatch = text.match(/\[download\]\s+Destination:\s+(.+)/i);
    if (destMatch) {
      destinationPath = destMatch[1].trim();
      onProgress?.({
        status: "downloading",
        downloadedBytes: 0,
        filename: destinationPath,
      });
    }
  };

  const onData = (chunk: Buffer) => {
    const text = chunk.toString();
    stderrBuf += text;
    // yt-dlp progress lines look like: [download]  45.2% of 12.34MiB at 2.10MiB/s ETA 00:06
    const progressMatch = text.match(
      /\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+~?([\d.]+)(\w+)/i
    );
    if (progressMatch && onProgress) {
      const percent = parseFloat(progressMatch[1]);
      const size = parseFloat(progressMatch[2]);
      const unit = progressMatch[3].toLowerCase();
      const totalBytes = size * unitToBytes(unit);
      const speedMatch = text.match(/at\s+([\d.]+)(\w+)\/s/i);
      const speedBytesPerSec = speedMatch
        ? parseFloat(speedMatch[1]) * unitToBytes(speedMatch[2].toLowerCase())
        : undefined;
      const etaMatch = text.match(/ETA\s+(\d+):(\d+)/i);
      const etaSeconds = etaMatch
        ? parseInt(etaMatch[1], 10) * 60 + parseInt(etaMatch[2], 10)
        : undefined;

      // Only emit when the percentage actually moved to avoid spamming.
      if (percent - lastProgress >= 0.5 || percent >= 100) {
        lastProgress = percent;
        onProgress({
          status: "downloading",
          downloadedBytes: Math.round((percent / 100) * totalBytes),
          totalBytes,
          speedBytesPerSec,
          etaSeconds,
        });
      }
    }

    // Some yt-dlp versions/configs put the destination line on stderr too.
    const destMatch = text.match(
      /\[download\]\s+Destination:\s+(.+)/i
    );
    if (destMatch) {
      destinationPath = destMatch[1].trim();
      onProgress?.({
        status: "downloading",
        downloadedBytes: 0,
        filename: destinationPath,
      });
    }
  };

  child.stdout?.on("data", onStdout);
  child.stderr?.on("data", onData);

  await new Promise<void>((resolve, reject) => {
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `yt-dlp exited with code ${code}: ${sanitizeError(stderrBuf)}`
          )
        );
      }
    });
    child.on("error", reject);

    // Poll for cancellation and kill the child process if requested.
    if (onCancel) {
      const pollCancel = setInterval(() => {
        if (onCancel()) {
          clearInterval(pollCancel);
          child.kill("SIGTERM");
        }
      }, 500);
      child.once("close", () => clearInterval(pollCancel));
    }
  });

  // The [download] Destination line is printed before the transfer starts;
  // if it never showed up, fall back to the output template.
  const filePath = destinationPath || resolveTemplatePath(outTemplate);

  // If the final file doesn't exist but a `.part` does, the transfer was
  // interrupted — keep the `.part` so the next attempt can resume it.
  if (!existsSync(filePath) && existsSync(`${filePath}.part`)) {
    onProgress?.({
      status: "downloading",
      downloadedBytes: 0,
      filename: filePath,
    });
  }

  // HEVC → H.264: probe the finished file and, if the video track is HEVC,
  // rewrite it to H.264 in place. Only TikTok/Instagram ship HEVC, and only
  // those platforms pay the ffprobe cost — YouTube downloads skip this.
  if (checkHEVC && (await fileUsesHEVC(filePath))) {
    const transcoded = await transcodeToH264(filePath);
    if (transcoded) {
      onProgress?.({ status: "downloading", downloadedBytes: 0, filename: transcoded });
    }
  }

  onProgress?.({ status: "finished", downloadedBytes: 0 });

  return {
    filePath,
    formatId,
  };
}

/**
 * Fallback output path when the [download] Destination line wasn't captured.
 * yt-dlp fills in %(title)s/%(ext)s; we only substitute the extension so the
 * job has a stable path to report. The actual file is streamed by the download
 * manager from whatever yt-dlp wrote.
 */
function resolveTemplatePath(outTemplate: string): string {
  return outTemplate.replace(/%\(ext\)s/g, "mp4");
}

/**
 * True when a downloaded file's video track is HEVC/H.265.
 * Uses ffprobe (fast, local) instead of a second yt-dlp extraction.
 */
async function fileUsesHEVC(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_name",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { maxBuffer: 1024 * 1024, timeout: 15_000 }
    );
    const codec = stdout.trim().toLowerCase();
    return codec === "hevc" || codec === "h265" || codec.includes("265");
  } catch {
    // If the file can't be probed, leave it as-is rather than blocking.
    return false;
  }
}

/**
 * Rewrite a file's video track from HEVC/H.265 to H.264 (AAC audio preserved).
 * Writes to a temp sibling then atomically renames over the original.
 * Returns the final path, or null if transcoding failed (caller keeps the
 * original file).
 */
async function transcodeToH264(filePath: string): Promise<string | null> {
  const tmp = `${filePath}.h264.tmp.mp4`;
  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      filePath,
      "-c:v",
      "libx264",
      "-crf",
      "23",
      "-preset",
      "veryfast",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      tmp,
    ], { maxBuffer: 1024 * 1024, timeout: 120_000 });
    await rename(tmp, filePath);
    return filePath;
  } catch (err) {
    await unlink(tmp).catch(() => {});
    console.warn(
      `[ytdlp] HEVC->H.264 transcode failed for ${filePath}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

function unitToBytes(unit: string): number {
  switch (unit) {
    case "k":
    case "kb":
      return 1024;
    case "m":
    case "mb":
      return 1024 * 1024;
    case "g":
    case "gb":
      return 1024 * 1024 * 1024;
    default:
      return 1;
  }
}

function sanitizeError(text: string): string {
  return text.replace(/^\[download\]\s+/gm, "").trim().slice(0, 1000);
}
