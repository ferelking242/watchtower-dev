import React, { useState } from 'react';
import { Play, ChevronDown } from 'lucide-react';

const METHODS = [
  { id: 'getPopular',       label: 'getPopular',       params: ['page'], category: 'browse' },
  { id: 'getLatestUpdates', label: 'getLatestUpdates', params: ['page'], category: 'browse' },
  { id: 'search',           label: 'search',           params: ['query', 'page'], category: 'browse' },
  { id: 'getDetail',        label: 'getDetail',        params: ['url'], category: 'detail' },
  { id: 'getPageList',      label: 'getPageList',      params: ['url'], category: 'reader' },
  { id: 'getVideoList',     label: 'getVideoList',     params: ['url'], category: 'video' },
  { id: 'getFilterList',    label: 'getFilterList',    params: [], category: 'meta' },
  { id: 'getSourcePreferences', label: 'getSourcePreferences', params: [], category: 'meta' },
  { id: 'supportsLatest',   label: 'supportsLatest',   params: [], category: 'meta' },
];

const CATEGORY_COLORS = {
  browse: 'text-accent-blue',
  detail: 'text-yellow-400',
  reader: 'text-green-400',
  video:  'text-purple-400',
  meta:   'text-gray-400',
};

export default function TestRunner({ extension, running, onRun, result, error }) {
  const [method, setMethod]     = useState('getPopular');
  const [params, setParams]     = useState({ page: 1, query: '', url: '' });
  const [showSource, setShowSource] = useState(false);
  const [source, setSource]     = useState({
    id: 'dev-source',
    name: 'Dev Source',
    lang: 'en',
    baseUrl: '',
    typeSource: 1,
  });

  const selectedMethod = METHODS.find(m => m.id === method);

  const handleRun = () => {
    if (!extension || running) return;
    const p = {};
    for (const k of (selectedMethod?.params || [])) p[k] = params[k] ?? '';
    onRun({ method, params: p, source });
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) handleRun(); };

  return (
    <div className="shrink-0 bg-surface-1 border-b border-white/5 px-4 py-3">
      <div className="flex items-start gap-3">
        {/* Method selector */}
        <div className="shrink-0">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">Method</label>
          <select
            className="input text-xs py-1.5 w-44 font-mono"
            value={method}
            onChange={e => setMethod(e.target.value)}
          >
            {['browse', 'detail', 'reader', 'video', 'meta'].map(cat => (
              <optgroup key={cat} label={cat.toUpperCase()} className="text-gray-400">
                {METHODS.filter(m => m.category === cat).map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Params */}
        <div className="flex-1 flex items-end gap-2">
          {selectedMethod?.params.includes('page') && (
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">Page</label>
              <input type="number" min={1} className="input text-xs py-1.5 w-16" value={params.page} onChange={e => setParams(p => ({ ...p, page: Number(e.target.value) }))} onKeyDown={handleKey} />
            </div>
          )}
          {selectedMethod?.params.includes('query') && (
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">Query</label>
              <input type="text" className="input text-xs py-1.5" placeholder="Search query…" value={params.query} onChange={e => setParams(p => ({ ...p, query: e.target.value }))} onKeyDown={handleKey} />
            </div>
          )}
          {selectedMethod?.params.includes('url') && (
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">URL</label>
              <input type="text" className="input text-xs py-1.5 font-mono" placeholder="https://…" value={params.url} onChange={e => setParams(p => ({ ...p, url: e.target.value }))} onKeyDown={handleKey} />
            </div>
          )}
          {selectedMethod?.params.length === 0 && (
            <div className="flex-1 flex items-end pb-0.5">
              <span className="text-xs text-gray-500 italic">No parameters</span>
            </div>
          )}
        </div>

        {/* Source config toggle */}
        <div className="shrink-0">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">Source</label>
          <button onClick={() => setShowSource(!showSource)} className="input text-xs py-1.5 flex items-center gap-1.5 w-32 cursor-pointer">
            <span className="truncate flex-1 text-left">{source.name}</span>
            <ChevronDown size={11} className={`shrink-0 transition-transform ${showSource ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Run button */}
        <div className="shrink-0">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">&nbsp;</label>
          <button
            onClick={handleRun}
            disabled={!extension || running}
            className="btn-primary py-1.5 min-w-[80px] justify-center"
          >
            {running ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full pulse-dot" />
                Running
              </span>
            ) : (
              <><Play size={13} />Run</>
            )}
          </button>
        </div>
      </div>

      {/* Source config dropdown */}
      {showSource && (
        <div className="mt-3 p-3 bg-surface-2 rounded-xl border border-white/5 grid grid-cols-3 gap-2">
          {[
            ['id', 'Source ID', 'dev-source'],
            ['name', 'Name', 'Dev Source'],
            ['lang', 'Lang', 'en'],
            ['baseUrl', 'Base URL', 'https://…'],
          ].map(([key, label, ph]) => (
            <div key={key}>
              <label className="block text-[10px] text-gray-500 mb-1">{label}</label>
              <input className="input text-xs py-1" placeholder={ph} value={source[key] || ''} onChange={e => setSource(s => ({ ...s, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Type</label>
            <select className="input text-xs py-1" value={source.typeSource || 1} onChange={e => setSource(s => ({ ...s, typeSource: Number(e.target.value) }))}>
              <option value={1}>Manga (1)</option>
              <option value={2}>Anime (2)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
