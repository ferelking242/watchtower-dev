import { Router } from 'express';
import axios from 'axios';

const router = Router();

const REPO_OWNER = 'ferelking242';
const REPO_NAME  = 'watchtower-extensions';
const RAW_BASE   = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;

function ghHeaders() {
  const h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const tok = process.env.GITHUB_TOKEN;
  if (tok) h['Authorization'] = `Bearer ${tok}`;
  return h;
}

const cache = new Map();
function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttl) return Promise.resolve(hit.data);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

const CATEGORIES = ['manga', 'watch', 'novel', 'game', 'music'];

async function fetchIndex(category) {
  const url = `${RAW_BASE}/index/${category}.json`;
  const resp = await axios.get(url, { headers: ghHeaders() });
  return resp.data;
}

function normalizeExt(item, category) {
  const type = item.sourceCodeLanguage === 1 ? 'js' : 'dart';
  return {
    id:              item.id,
    name:            item.name,
    lang:            item.lang || 'all',
    type,
    category,
    sourceCodeUrl:   item.sourceCodeUrl || null,
    iconUrl:         item.iconUrl ? `/wt/proxy?url=${encodeURIComponent(item.iconUrl)}` : null,
    baseUrl:         item.baseUrl || '',
    version:         item.version || '1.0.0',
    isNsfw:          item.isNsfw || false,
    hasCloudflare:   item.hasCloudflare || false,
    paywall:         item.paywall || 'free',
    requiresAccount: item.requiresAccount || false,
    isAggregator:    item.isAggregator || false,
    notes:           item.notes || '',
    subCategories:   item.subCategories || [],
  };
}

router.get('/list', async (req, res) => {
  const { category = 'all', lang = 'all', type = 'all', nsfw = 'false' } = req.query;
  try {
    const cats = category === 'all' ? CATEGORIES : [category].filter(c => CATEGORIES.includes(c));
    const results = await Promise.all(
      cats.map(cat =>
        cached(`index-${cat}`, 10 * 60 * 1000, () => fetchIndex(cat))
          .then(items => (Array.isArray(items) ? items : []).map(i => normalizeExt(i, cat)))
          .catch(() => [])
      )
    );
    let exts = results.flat();
    if (lang !== 'all') exts = exts.filter(e => e.lang === lang || e.lang === 'multi' || e.lang === 'all');
    if (type !== 'all') exts = exts.filter(e => e.type === type);
    if (nsfw === 'false') exts = exts.filter(e => !e.isNsfw);
    res.json(exts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/code', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  try {
    const data = await cached(`code-${url}`, 15 * 60 * 1000, async () => {
      const resp = await axios.get(url, {
        headers: { ...ghHeaders(), Accept: 'text/plain' },
        responseType: 'text',
        transformResponse: [d => d],
      });
      return { code: resp.data };
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/langs', async (req, res) => {
  const { category = 'all' } = req.query;
  try {
    const cats = category === 'all' ? CATEGORIES : [category];
    const results = await Promise.all(
      cats.map(cat =>
        cached(`index-${cat}`, 10 * 60 * 1000, () => fetchIndex(cat))
          .then(items => (Array.isArray(items) ? items : []).map(i => i.lang || 'all'))
          .catch(() => [])
      )
    );
    const langs = [...new Set(results.flat())].sort();
    res.json(langs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const results = await Promise.all(
      CATEGORIES.map(cat =>
        cached(`index-${cat}`, 10 * 60 * 1000, () => fetchIndex(cat))
          .then(items => ({ cat, count: Array.isArray(items) ? items.length : 0 }))
          .catch(() => ({ cat, count: 0 }))
      )
    );
    res.json(Object.fromEntries(results.map(r => [r.cat, r.count])));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
