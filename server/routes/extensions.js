// GET /api/extensions — browse mangayomi-extensions GitHub repo
import { Router } from 'express';
import axios from 'axios';

const router = Router();
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO_OWNER = 'kodjodevf';
const REPO_NAME = 'mangayomi-extensions';
const BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

function ghHeaders() {
  const h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (GITHUB_TOKEN) h['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  return h;
}

// Cache simple en mémoire (5 min)
const cache = new Map();
function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttl) return Promise.resolve(hit.data);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

// Repo structure:
// javascript/manga/src/<lang>/<source>/<file>.js
// javascript/novel/src/<lang>/<source>/<file>.js
// dart/manga/<lang>/<source>/<file>.dart
// dart/novel/<lang>/<source>/<file>.dart

// GET /api/extensions/list?lang=all&type=all&category=all
router.get('/list', async (req, res) => {
  const { lang = 'all', type = 'all', category = 'all' } = req.query;
  try {
    const data = await cached(`list-${lang}-${type}-${category}`, 5 * 60 * 1000, async () => {
      const treeResp = await axios.get(`${BASE_URL}/git/trees/main?recursive=1`, { headers: ghHeaders() });
      const tree = treeResp.data.tree || [];

      const extensions = [];
      for (const item of tree) {
        if (item.type !== 'blob') continue;
        const path = item.path;

        // JS extensions: javascript/<category>/src/<lang>/<file>.js
        const jsMatch = path.match(/^javascript\/(manga|novel)\/src\/([^/]+)\/([^/]+\.js)$/);
        if (jsMatch) {
          const [, cat, extLang, file] = jsMatch;
          const source = file.replace('.js', '');
          const name = source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          if ((lang === 'all' || extLang === lang) && (type === 'all' || type === 'js') && (category === 'all' || cat === category)) {
            extensions.push({ id: `${cat}-${extLang}-${source}`, name, lang: extLang, type: 'js', category: cat, path, source });
          }
        }

        // Dart extensions: dart/<category>/multisrc/<multisrc>/src/<lang>/<source>/<file>.dart
        // or dart/<category>/<file>.dart (top-level, skip)
        const dartMatch = path.match(/^dart\/(manga|novel)\/(?:multisrc\/[^/]+\/)?src\/([^/]+)\/([^/]+)\/([^/]+\.dart)$/);
        if (dartMatch) {
          const [, cat, extLang, source] = dartMatch;
          const name = source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          if ((lang === 'all' || extLang === lang) && (type === 'all' || type === 'dart') && (category === 'all' || cat === category)) {
            extensions.push({ id: `dart-${cat}-${extLang}-${source}`, name, lang: extLang, type: 'dart', category: cat, path, source });
          }
        }
      }
      return extensions;
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/extensions/code?path=javascript/manga/src/en/...
router.get('/code', async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing path' });

  try {
    const data = await cached(`code-${path}`, 10 * 60 * 1000, async () => {
      const resp = await axios.get(`${BASE_URL}/contents/${path}`, { headers: ghHeaders() });
      const content = Buffer.from(resp.data.content, 'base64').toString('utf-8');
      return { code: content, sha: resp.data.sha, size: resp.data.size };
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/extensions/langs — list available languages across all JS extensions
router.get('/langs', async (req, res) => {
  try {
    const data = await cached('langs', 10 * 60 * 1000, async () => {
      const [mangaResp, novelResp] = await Promise.all([
        axios.get(`${BASE_URL}/contents/javascript/manga/src`, { headers: ghHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/contents/javascript/novel/src`, { headers: ghHeaders() }).catch(() => ({ data: [] })),
      ]);
      const dirs = [
        ...(mangaResp.data || []).filter(d => d.type === 'dir').map(d => d.name),
        ...(novelResp.data || []).filter(d => d.type === 'dir').map(d => d.name),
      ];
      return [...new Set(dirs)].sort();
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/extensions/raw?path= — raw file content
router.get('/raw', async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing path' });
  try {
    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${path}`;
    const resp = await axios.get(rawUrl, { responseType: 'text', transformResponse: [d => d] });
    res.setHeader('Content-Type', 'text/plain');
    res.send(resp.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
