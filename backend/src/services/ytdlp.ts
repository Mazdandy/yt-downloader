import { execFile } from "child_process";
import { promisify } from "util";
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
  metadata: YtDlpMetadata;
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
 */
export async function fetchMetadata(url: string): Promise<YtDlpMetadata> {
  const { stdout } = await execFileAsync(
    config.ytdlpPath,
    [...COMMON_ARGS, "-J", url],
    {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30_000,
    }
  );
  return JSON.parse(stdout) as YtDlpMetadata;
}

/**
 * Download a specific format to a temp file, then resolve its final path.
 * `--no-part` disables .part files; `--force-overwrites` keeps retries clean.
 * Pass an `onCancel` callback (e.g. from the job manager) to abort the child process.
 */
export async function downloadFormat(
  url: string,
  formatId: string,
  outTemplate: string,
  onProgress?: ProgressCallback,
  onCancel?: () => boolean
): Promise<YtDlpDownloadInfo> {
  const args = [
    ...COMMON_ARGS,
    "-f",
    formatId,
    "--no-part",
    "--force-overwrites",
    "-o",
    outTemplate,
  ];

  if (onProgress) {
    args.push("--newline", "--progress");
  }

  const child = execFile(config.ytdlpPath, [...args, url], {
    maxBuffer: 10 * 1024 * 1024,
  });

  let stderrBuf = "";
  let lastProgress = 0;

  if (onProgress) {
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderrBuf += text;
      // yt-dlp progress lines look like: [download]  45.2% of 12.34MiB at 2.10MiB/s ETA 00:06
      const progressMatch = text.match(
        /\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+~?([\d.]+)(\w+)/i
      );
      if (progressMatch) {
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

      const destMatch = text.match(
        /\[download\]\s+Destination:\s+(.+)/i
      );
      if (destMatch) {
        onProgress({
          status: "downloading",
          downloadedBytes: 0,
          filename: destMatch[1].trim(),
        });
      }
    });
  }

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

  const filePath = await resolveOutputPath(url, formatId, outTemplate);

  onProgress?.({ status: "finished", downloadedBytes: 0 });

  return {
    filePath,
    formatId,
    metadata: await fetchMetadataForFormat(url, formatId),
  };
}

/**
 * Resolve the real output file path yt-dlp will produce.
 * `--print after_move:filepath` prints the final path after the download finishes;
 * we run it with the same output template so the value matches exactly.
 */
async function resolveOutputPath(
  url: string,
  formatId: string,
  outTemplate: string
): Promise<string> {
  const { stdout } = await execFileAsync(
    config.ytdlpPath,
    [...COMMON_ARGS, "--print", "after_move:filepath", "-f", formatId, "-o", outTemplate, url],
    { maxBuffer: 1024 * 1024, timeout: 30_000 }
  );
  const path = stdout.trim().split("\n")[0];
  return path || outTemplate;
}

async function fetchMetadataForFormat(
  url: string,
  formatId: string
): Promise<YtDlpMetadata> {
  const { stdout } = await execFileAsync(
    config.ytdlpPath,
    [...COMMON_ARGS, "-J", "-f", formatId, url],
    { maxBuffer: 10 * 1024 * 1024, timeout: 30_000 }
  );
  return JSON.parse(stdout) as YtDlpMetadata;
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
