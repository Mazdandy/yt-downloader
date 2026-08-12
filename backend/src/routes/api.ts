import { Router, Request, Response } from "express";
import { existsSync, createReadStream, statSync, unlink } from "fs";
import { validateUrl } from "../services/urlDetection.js";
import { fetchMetadata } from "../services/ytdlp.js";
import { buildParseResponse } from "../services/parseService.js";
import { downloadManager, createJob } from "../services/downloadManager.js";
import { Platform } from "../types.js";

export const apiRouter = Router();

/** POST /api/v1/parse — resolve a URL into metadata + quality options */
apiRouter.post("/parse", async (req: Request, res: Response) => {
  const url = (req.body?.url ?? "").toString();
  const validation = validateUrl(url);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }
  const platform = validation.platform;

  try {
    const metadata = await fetchMetadata(url);
    res.json(buildParseResponse(url, platform as Platform, metadata));
  } catch (err) {
    res.status(422).json({
      error: "Could not resolve video. It may be private, region-locked, or unavailable.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

/** POST /api/v1/download — queue a download; response carries the job id */
apiRouter.post("/download", async (req: Request, res: Response) => {
  const url = (req.body?.url ?? "").toString();
  const formatId = (req.body?.formatId ?? "").toString();
  const platform = (req.body?.platform ?? "").toString();

  const validation = validateUrl(url);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }
  if (!formatId) {
    res.status(400).json({ error: "formatId is required" });
    return;
  }

  const job = createJob({
    url,
    platform: validation.platform,
    formatId,
    title: (req.body?.title ?? "video").toString(),
  });

  downloadManager.enqueue(job);

  res.status(202).json({
    id: job.id,
    status: job.status,
  });
});

/** GET /api/v1/status/:id — poll a job's progress */
apiRouter.get("/status/:id", (req: Request, res: Response) => {
  const job = downloadManager.get(String(req.params.id));
  if (!job) {
    res.status(404).json({ error: "Download job not found" });
    return;
  }
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    phase: job.phase,
    speedBytesPerSec: job.speedBytesPerSec,
    etaSeconds: job.etaSeconds,
    totalBytes: job.totalBytes,
    downloadedBytes: job.downloadedBytes,
    title: job.title,
    platform: job.platform,
    formatId: job.formatId,
    error: job.error,
  });
});

/** DELETE /api/v1/cancel/:id — cancel a queued or active download */
apiRouter.delete("/cancel/:id", (req: Request, res: Response) => {
  const ok = downloadManager.cancel(String(req.params.id));
  if (!ok) {
    res.status(404).json({ error: "Download job not found or not cancellable" });
    return;
  }
  res.json({ ok: true, id: String(req.params.id) });
});

/** GET /api/v1/file/:id — stream the finished file to the client, then delete it */
apiRouter.get("/file/:id", (req: Request, res: Response) => {
  const job = downloadManager.get(String(req.params.id));
  if (!job || job.status !== "finished" || !job.filePath) {
    res.status(404).json({ error: "File not available or not finished yet" });
    return;
  }
  const filePath = job.filePath;
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "File no longer exists on server" });
    return;
  }

  const stat = statSync(filePath);
  const total = stat.size;
  const range = req.headers.range;
  const ext = filePath.split(".").pop()?.toLowerCase() || "mp4";
  const mime = ext === "mp3" ? "audio/mpeg" : ext === "m4a" ? "audio/mp4" : ext === "webm" ? "video/webm" : "video/mp4";

  // Support HTTP range requests so browsers can seek in the video.
  const cleanup = () => unlink(filePath, () => {}); // PRD FR-16: no server storage
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
      if (start >= 0 && start <= end && start < total) {
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Length", String(end - start + 1));
        res.setHeader("Content-Type", mime);
        const stream = createReadStream(filePath, { start, end });
        stream.pipe(res);
        res.on("close", cleanup);
        stream.on("error", cleanup);
        return;
      }
      res.status(416).json({ error: "Range not satisfiable" });
      return;
    }
  }

  // PRD FR-12: filename pattern [Platform]_[Title]_[Quality].mp4
  const safeTitle = job.title
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  const qualityLabel = job.formatId;
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Length", String(total));
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${job.platform}_${safeTitle}_${qualityLabel}.${ext}"`
  );

  const stream = createReadStream(filePath);
  stream.pipe(res);
  res.on("close", cleanup);
  stream.on("error", cleanup);
});

export default apiRouter;
