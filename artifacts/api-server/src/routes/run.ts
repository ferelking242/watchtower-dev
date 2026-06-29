import { Router, type Request, type Response } from "express";
import { runJsExtension, type LogEntry } from "../engine/js-runner.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { code, type = "js", source = {}, method, params = {} } = req.body as {
    code?: string;
    type?: string;
    source?: Record<string, unknown>;
    method?: string;
    params?: Record<string, unknown>;
  };

  if (!code) return res.status(400).json({ error: "Missing extension code" });
  if (!method) return res.status(400).json({ error: "Missing method" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const ac = new AbortController();
  req.on("close", () => ac.abort());

  const streamLog = (entry: LogEntry) => {
    sendEvent({ ...entry, event: "log" });
  };

  try {
    if (type !== "js") {
      sendEvent({ type: "error", message: "Dart engine requires local Dart SDK — not available in web mode." });
      return res.end();
    }

    const { result, error, timing } = await runJsExtension({
      code,
      source,
      method,
      params,
      onLog: streamLog,
      signal: ac.signal,
    });

    if (error) {
      sendEvent({ type: "done", success: false, error, timing });
    } else {
      sendEvent({ type: "done", success: true, result, timing });
    }
  } catch (err) {
    const e = err as Error;
    sendEvent({ type: "done", success: false, error: { name: e.name, message: e.message }, timing: 0 });
  }

  return res.end();
});

router.post("/json", async (req: Request, res: Response) => {
  const { code, type = "js", source = {}, method, params = {} } = req.body as {
    code?: string;
    type?: string;
    source?: Record<string, unknown>;
    method?: string;
    params?: Record<string, unknown>;
  };

  if (!code) return res.status(400).json({ error: "Missing extension code" });
  if (!method) return res.status(400).json({ error: "Missing method" });

  try {
    if (type !== "js") {
      return res.json({ success: false, error: { message: "Dart engine requires local Dart SDK" }, logs: [], timing: 0 });
    }

    const { result, error, logs, timing } = await runJsExtension({
      code,
      source,
      method,
      params,
      signal: AbortSignal.timeout(60000),
    });

    return res.json({ success: !error, result, error, logs, timing });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: (err as Error).message } });
  }
});

export default router;
