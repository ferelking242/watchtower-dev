import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import runRouter from './routes/run.js';
import extensionsRouter from './routes/extensions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ── Image proxy — with in-memory cache + request deduplication ────────────────
// Cache stores { ct, buf } for 24 hours. Inflight map deduplicates parallel
// requests for the same URL so GitHub rate limits are not triggered.
const _proxyCache   = new Map();    // url → { ct, buf, expires }
const _proxyInflight = new Map();   // url → Promise<{ct,buf}>

app.get('/wt/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url');

  try { new URL(url); } catch { return res.status(400).send('Invalid url'); }

  // 1. Return from cache if still fresh
  const cached = _proxyCache.get(url);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('Content-Type', cached.ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Cache', 'HIT');
    return res.send(cached.buf);
  }

  // 2. Deduplicate concurrent requests for the same URL
  if (!_proxyInflight.has(url)) {
    const fetch = axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*',
      },
      maxRedirects: 5,
    }).then(resp => {
      const ct  = resp.headers['content-type'] || 'image/png';
      const buf = Buffer.from(resp.data);
      _proxyCache.set(url, { ct, buf, expires: Date.now() + 86400_000 });
      _proxyInflight.delete(url);
      return { ct, buf };
    }).catch(err => {
      _proxyInflight.delete(url);
      throw err;
    });
    _proxyInflight.set(url, fetch);
  }

  try {
    const { ct, buf } = await _proxyInflight.get(url);
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Cache', 'MISS');
    res.send(buf);
  } catch (err) {
    const status = err?.response?.status || 502;
    res.status(status).send('Proxy error: ' + (err?.message || 'unknown'));
  }
});

// ── API ───────────────────────────────────────────────────────────────────────
app.use('/wt/run', runRouter);
app.use('/wt/extensions', extensionsRouter);
app.get('/wt/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ── Static client ─────────────────────────────────────────────────────────────
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
} else {
  const { createProxyMiddleware } = await import('http-proxy-middleware').catch(() => ({ createProxyMiddleware: null }));
  if (createProxyMiddleware) {
    app.use('/', createProxyMiddleware({ target: 'http://localhost:5173', changeOrigin: true, ws: true }));
  } else {
    app.get('/', (_, res) => res.send('<h1>Watchtower Dev — run: cd client && npm run build</h1>'));
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🗼  Watchtower Dev  running on http://0.0.0.0:${PORT}\n`);
});
