import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, ChevronDown, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils.js';

const METHODS = [
  { id: 'getPopular',           params: ['page'],          cat: 'browse' },
  { id: 'getLatestUpdates',     params: ['page'],          cat: 'browse' },
  { id: 'search',               params: ['query', 'page'], cat: 'browse' },
  { id: 'getDetail',            params: ['url'],           cat: 'detail' },
  { id: 'getPageList',          params: ['url'],           cat: 'reader' },
  { id: 'getVideoList',         params: ['url'],           cat: 'video'  },
  { id: 'getFilterList',        params: [],                cat: 'meta'   },
  { id: 'getSourcePreferences', params: [],                cat: 'meta'   },
  { id: 'supportsLatest',       params: [],                cat: 'meta'   },
];

const CAT_COLORS = {
  browse: 'text-blue-400', detail: 'text-amber-400',
  reader: 'text-emerald-400', video: 'text-violet-400', meta: 'text-muted-foreground',
};

export default function TestRunner({ extension, running, onRun }) {
  const { t } = useTranslation();
  const [method, setMethod]   = useState('getPopular');
  const [page, setPage]       = useState(1);
  const [query, setQuery]     = useState('');
  const [url, setUrl]         = useState('');
  const [showSrc, setShowSrc] = useState(false);
  const [source, setSource]   = useState({
    id: 'dev-source', name: 'Dev Source', lang: 'en', baseUrl: '', typeSource: 1,
  });

  const sel = METHODS.find(m => m.id === method);

  useEffect(() => {
    if (extension) {
      setSource(s => ({
        ...s,
        id:      String(extension.id || 'dev-source'),
        name:    extension.name || s.name,
        lang:    extension.lang || s.lang,
        baseUrl: extension.baseUrl || s.baseUrl,
      }));
    }
  }, [extension]);

  const handleRun = () => {
    if (!extension || running) return;
    const params = {};
    if (sel?.params.includes('page'))  params.page  = page;
    if (sel?.params.includes('query')) params.query = query;
    if (sel?.params.includes('url'))   params.url   = url;
    onRun({ method, params, source });
  };

  const onKey = (e) => { if (e.key === 'Enter') handleRun(); };

  return (
    <div className="shrink-0 bg-card border-b border-border px-4 py-3">
      <div className="flex items-end gap-3 flex-wrap">

        {/* Method selector */}
        <div className="shrink-0">
          <label className="block text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
            {t('runner.method')}
          </label>
          <div className="relative">
            <select
              className="appearance-none bg-secondary border border-border rounded-lg pl-3 pr-7 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:border-ring transition-colors cursor-pointer min-w-[200px]"
              value={method}
              onChange={e => setMethod(e.target.value)}
            >
              {['browse', 'detail', 'reader', 'video', 'meta'].map(cat => (
                <optgroup key={cat} label={cat.toUpperCase()}>
                  {METHODS.filter(m => m.cat === cat).map(m => (
                    <option key={m.id} value={m.id}>{m.id}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <span className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full', CAT_COLORS[sel?.cat])} style={{background:'currentColor', left:'auto', right:'1.5rem', display:'none'}} />
          </div>
        </div>

        {/* Params */}
        <div className="flex items-end gap-2 flex-1 min-w-0">
          {sel?.params.includes('page') && (
            <div className="shrink-0">
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{t('runner.page')}</label>
              <input type="number" min={1}
                className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground w-20 focus:outline-none focus:border-ring transition-colors"
                value={page}
                onChange={e => setPage(Math.max(1, Number(e.target.value)))}
                onKeyDown={onKey}
              />
            </div>
          )}
          {sel?.params.includes('query') && (
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{t('runner.query')}</label>
              <input type="text"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
                placeholder="Search term…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKey}
              />
            </div>
          )}
          {sel?.params.includes('url') && (
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{t('runner.url')}</label>
              <input type="text"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground font-mono placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
                placeholder="https://…"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={onKey}
              />
            </div>
          )}
          {sel?.params.length === 0 && (
            <div className="flex-1 flex items-end pb-0.5">
              <span className="text-sm text-muted-foreground italic">{t('runner.noParams')}</span>
            </div>
          )}
        </div>

        {/* Source */}
        <div className="shrink-0">
          <label className="block text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{t('runner.source')}</label>
          <button
            onClick={() => setShowSrc(v => !v)}
            className={cn(
              'flex items-center gap-2 bg-secondary border rounded-lg px-3 py-1.5 text-sm transition-colors',
              showSrc ? 'border-ring text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings2 size={12} />
            <span className="text-xs font-medium max-w-[80px] truncate">{source.name}</span>
            <ChevronDown size={10} className={cn('transition-transform', showSrc && 'rotate-180')} />
          </button>
        </div>

        {/* Run */}
        <button
          onClick={handleRun}
          disabled={!extension || running}
          className={cn(
            'shrink-0 flex items-center gap-2 px-5 py-1.5 rounded-lg font-semibold text-sm transition-all',
            !extension || running
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:opacity-90 shadow-lg'
          )}
        >
          {running ? (
            <><span className="w-2 h-2 rounded-full bg-current animate-pulse" />{t('runner.running')}</>
          ) : (
            <><Play size={12} fill="currentColor" />{t('runner.run')}</>
          )}
        </button>
      </div>

      {/* Source config panel */}
      {showSrc && (
        <div className="mt-3 p-3 bg-secondary/50 rounded-xl border border-border grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['id',      t('runner.sourceId'),    'text', 'my-source'],
            ['name',    t('runner.displayName'),  'text', 'My Source'],
            ['lang',    t('runner.language'),     'text', 'en'],
            ['baseUrl', t('runner.baseUrl'),      'text', 'https://…'],
          ].map(([key, label, type, ph]) => (
            <div key={key}>
              <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
              <input type={type}
                className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
                placeholder={ph}
                value={source[key] || ''}
                onChange={e => setSource(s => ({ ...s, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
