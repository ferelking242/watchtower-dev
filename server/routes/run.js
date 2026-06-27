// POST /api/run — test an extension method
import { Router } from 'express';
import { runJsExtension } from '../engine/js-runner.js';

const router = Router();

router.post('/', async (req, res) => {
  const { code, type = 'js', source = {}, method, params = {} } = req.body;

  if (!code) return res.status(400).json({ error: 'Missing extension code' });
  if (!method) return res.status(400).json({ error: 'Missing method' });

  const logs = [];
  const onLog = (entry) => logs.push(entry);

  // SSE streaming — send log events in real time
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const ac = new AbortController();
  req.on('close', () => ac.abort());

  const streamLog = (entry) => {
    logs.push(entry);
    sendEvent({ type: 'log', ...entry });
  };

  try {
    let runner;
    if (type === 'js') {
      runner = runJsExtension({
        code, source, method, params,
        onLog: streamLog,
        signal: ac.signal,
      });
    } else {
      sendEvent({ type: 'error', message: 'Dart engine requires local Dart SDK — not available in web mode. Use the CLI tool for Dart extensions.' });
      res.end();
      return;
    }

    const { result, error, timing } = await runner;

    if (error) {
      sendEvent({ type: 'done', success: false, error, timing });
    } else {
      sendEvent({ type: 'done', success: true, result, timing });
    }
  } catch (err) {
    sendEvent({ type: 'done', success: false, error: { name: err.name, message: err.message }, timing: 0 });
  }

  res.end();
});

// POST /api/run/json — non-streaming version for CLI
router.post('/json', async (req, res) => {
  const { code, type = 'js', source = {}, method, params = {} } = req.body;

  if (!code) return res.status(400).json({ error: 'Missing extension code' });
  if (!method) return res.status(400).json({ error: 'Missing method' });

  try {
    if (type !== 'js') {
      return res.json({ success: false, error: { message: 'Dart engine requires local Dart SDK' }, logs: [], timing: 0 });
    }

    const { result, error, logs, timing } = await runJsExtension({
      code, source, method, params, signal: AbortSignal.timeout(60000),
    });

    res.json({ success: !error, result, error, logs, timing });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
