import React, { useState } from 'react';
import { ExternalLink, ChevronRight, BookOpen, Play, AlertTriangle, Loader } from 'lucide-react';

function CoverImage({ src, alt }) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);

  if (err || !src) {
    return (
      <div className="w-full h-full shimmer flex items-center justify-center">
        <span className="text-2xl opacity-20">📷</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && <div className="absolute inset-0 shimmer" />}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setErr(true)}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
      />
    </div>
  );
}

function MediaCard({ item, onClick }) {
  return (
    <button
      onClick={() => onClick?.(item)}
      className="group text-left rounded-xl overflow-hidden bg-surface-2 hover:bg-surface-3 border border-white/5 hover:border-accent-blue/30 transition-all"
    >
      <div className="aspect-[2/3] overflow-hidden bg-surface-3 relative">
        <CoverImage src={item.imageUrl || item.image || item.cover} alt={item.title} />
        {item.status && (
          <span className="absolute top-1.5 left-1.5 text-[10px] bg-black/70 text-gray-300 px-1.5 py-0.5 rounded">
            {item.status}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <ExternalLink size={14} className="text-white ml-auto" />
        </div>
      </div>
      <div className="p-2">
        <p className="text-xs font-medium text-gray-200 line-clamp-2 leading-tight">{item.title || item.name || '—'}</p>
        {item.link && (
          <p className="text-[10px] text-gray-600 truncate mt-0.5">{item.link}</p>
        )}
      </div>
    </button>
  );
}

function DetailView({ data }) {
  return (
    <div className="flex gap-6 p-6 max-w-3xl">
      <div className="w-32 h-48 rounded-xl overflow-hidden bg-surface-3 shrink-0">
        <CoverImage src={data.imageUrl || data.image || data.cover} alt={data.title} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-white mb-1">{data.title || data.name}</h2>
        {data.author && <p className="text-sm text-gray-400 mb-3">by {data.author}</p>}
        {data.description && <p className="text-sm text-gray-300 mb-4 line-clamp-4">{data.description}</p>}
        <div className="flex flex-wrap gap-2 mb-4">
          {(data.genre || data.genres || []).map((g, i) => (
            <span key={i} className="text-[11px] bg-surface-3 text-gray-400 px-2 py-0.5 rounded-full">{g}</span>
          ))}
        </div>
        {data.chapters?.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Chapters ({data.chapters.length})</p>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {data.chapters.slice(0, 30).map((ch, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-surface-2 rounded-lg text-xs">
                  <BookOpen size={11} className="text-gray-500 shrink-0" />
                  <span className="flex-1 truncate text-gray-300">{ch.name || ch.title || `Chapter ${ch.number || i + 1}`}</span>
                  {ch.link && <span className="text-[10px] text-gray-600 truncate max-w-32">{ch.link}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.episodes?.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Episodes ({data.episodes.length})</p>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {data.episodes.slice(0, 30).map((ep, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-surface-2 rounded-lg text-xs">
                  <Play size={11} className="text-gray-500 shrink-0" />
                  <span className="flex-1 truncate text-gray-300">{ep.name || ep.title || `Episode ${ep.number || i + 1}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RawJson({ data }) {
  return (
    <pre className="p-4 text-xs font-mono text-green-300 bg-surface-2 rounded-xl overflow-auto max-h-96 leading-relaxed border border-white/5">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function ResultGrid({ result, error, running }) {
  const [view, setView] = useState('grid'); // grid | raw

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <Loader size={24} className="animate-spin text-accent-blue" />
        <span className="text-sm">Running extension…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-4 p-6">
        <div className="w-8 h-8 bg-accent-red/20 rounded-lg flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-accent-red" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-accent-red text-sm mb-1">{error.name || 'Error'}</p>
          <p className="text-sm text-gray-300 mb-3 font-mono">{error.message}</p>
          {error.stack && (
            <pre className="text-xs text-gray-500 font-mono bg-surface-2 p-3 rounded-lg overflow-auto max-h-48 border border-white/5">{error.stack}</pre>
          )}
          {error.jsError && (
            <details className="mt-3">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">JS Error details</summary>
              <pre className="mt-2 text-xs text-gray-500 font-mono bg-surface-2 p-3 rounded-lg overflow-auto max-h-32 border border-white/5">
                {JSON.stringify(error.jsError, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
        <span className="text-4xl">🗼</span>
        <p className="text-sm">Select an extension and run a method</p>
        <p className="text-xs text-gray-700">Results will appear here</p>
      </div>
    );
  }

  // Detect result shape
  const items = getItems(result);
  const isDetail = result && (result.chapters || result.episodes || result.description !== undefined);
  const isPageList = Array.isArray(result) && result.length > 0 && (typeof result[0] === 'string' && result[0].startsWith('http'));
  const isVideoList = Array.isArray(result) && result.length > 0 && (result[0]?.url || result[0]?.videoUrl);

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* View toggle */}
      {items.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          <div className="flex gap-1">
            {['grid', 'raw'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-xs px-2 py-0.5 rounded ${view === v ? 'bg-surface-3 text-white' : 'text-gray-600 hover:text-gray-400'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'raw' || isPageList || isVideoList ? (
        <RawJson data={result} />
      ) : isDetail ? (
        <DetailView data={result} />
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {items.map((item, i) => <MediaCard key={i} item={item} />)}
        </div>
      ) : (
        <RawJson data={result} />
      )}
    </div>
  );
}

function getItems(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.list) return result.list;
  if (result.results) return result.results;
  if (result.manga) return result.manga;
  if (result.anime) return result.anime;
  if (result.data) return Array.isArray(result.data) ? result.data : [];
  return [];
}
