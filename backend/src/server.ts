import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import apiRouter from "./routes/api.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins.length === 1 && config.corsOrigins[0] === "*" ? true : config.corsOrigins,
  })
);
app.use(express.json({ limit: "64kb" }));

app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/v1", apiRouter);

// 404 for unknown API routes
app.use("/api/", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Central error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`Video downloader API listening on http://localhost:${config.port}`);
});
