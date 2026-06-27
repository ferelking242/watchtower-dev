import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import runRouter from './routes/run.js';
import extensionsRouter from './routes/extensions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ── API ───────────────────────────────────────────────────────────────────────
app.use('/api/run', runRouter);
app.use('/api/extensions', extensionsRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ── Static client ─────────────────────────────────────────────────────────────
import fs from 'fs';
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
} else {
  // Dev mode: proxy to Vite
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
