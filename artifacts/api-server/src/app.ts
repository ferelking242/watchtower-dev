import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import extensionsRouter from "./routes/extensions.js";
import runRouter from "./routes/run.js";
import { logger } from "./lib/logger.js";
import axios from "axios";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use("/api/wt/extensions", extensionsRouter);
app.use("/api/wt/run", runRouter);

app.get("/api/wt/proxy", async (req: Request, res: Response) => {
  const { url } = req.query as { url?: string };
  if (!url) return res.status(400).json({ error: "Missing url" });
  try {
    const decoded = decodeURIComponent(url);
    const parsed = new URL(decoded);

    const upstreamHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": parsed.origin + "/",
      "Origin": parsed.origin,
      "Accept": "*/*",
    };

    if (req.headers["range"]) {
      upstreamHeaders["Range"] = req.headers["range"] as string;
    }

    const resp = await axios.get(decoded, {
      responseType: "stream",
      timeout: 30000,
      headers: upstreamHeaders,
      validateStatus: () => true,
      maxRedirects: 5,
    });

    const ct = (resp.headers["content-type"] as string) || "application/octet-stream";
    res.setHeader("Content-Type", ct);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (ct.includes("video") || ct.includes("audio") || ct.includes("mpegurl") || ct.includes("octet-stream")) {
      if (resp.headers["content-length"]) res.setHeader("Content-Length", resp.headers["content-length"] as string);
      if (resp.headers["content-range"]) res.setHeader("Content-Range", resp.headers["content-range"] as string);
      if (resp.headers["accept-ranges"]) res.setHeader("Accept-Ranges", resp.headers["accept-ranges"] as string);
      res.status(resp.status);
    } else {
      res.setHeader("Cache-Control", "public, max-age=86400");
    }

    if (ct.includes("mpegurl") || ct.includes("m3u8") || decoded.includes(".m3u8")) {
      const chunks: Buffer[] = [];
      (resp.data as NodeJS.ReadableStream).on("data", (chunk: Buffer) => chunks.push(chunk));
      (resp.data as NodeJS.ReadableStream).on("end", () => {
        let m3u8 = Buffer.concat(chunks).toString("utf8");
        m3u8 = m3u8.replace(/^(?!#)(.+\.ts.*)$/gm, (line) => {
          try {
            const absUrl = new URL(line.trim(), decoded).href;
            return `/api/wt/proxy?url=${encodeURIComponent(absUrl)}`;
          } catch { return line; }
        });
        m3u8 = m3u8.replace(/^(?!#)(.+\.m3u8.*)$/gm, (line) => {
          try {
            const absUrl = new URL(line.trim(), decoded).href;
            return `/api/wt/proxy?url=${encodeURIComponent(absUrl)}`;
          } catch { return line; }
        });
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.end(m3u8);
      });
      return;
    }

    return (resp.data as NodeJS.ReadableStream).pipe(res);
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
});

export default app;
