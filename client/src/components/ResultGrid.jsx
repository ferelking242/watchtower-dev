import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, BookOpen, Play, AlertTriangle, Code2, LayoutGrid, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils.js';

function proxyImg(src) {
  if (!src) return null;
  return `/wt/proxy?url=${encodeURIComponent(src)}`;
}

function CoverImage({ src, alt }) {
  const [state, setState] = useState('loading');
  const proxied = proxyImg(src);
  if (!proxied || state === 'err') {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <span className="text-3xl opacity-20">🖼</span>
      </div>
    );
  }
  return (
    <div className="relative w-full h-full">
      {state === 'loading' && <div className="absolute inset-0 bg-muted animate-pulse" />}
      <img src={proxied} alt={alt}
        className={cn('w-full h-full object-cover transition-opacity duration-300', state === 'ok' ? 'opacity-100' : 'opacity-0')}
        onLoad={() => setState('ok')}
        onError={() => setState('err')}
      />
    </div>
  );
}

function MediaCard({ item, onOpen }) {
  const imgSrc = item.imageUrl || item.image || item.cover || item.thumbnail || item.poster;
  const title  = item.title || item.name || item.link || '—';
  return (
    <button onClick={() => onOpen?.(item)}
      className="group text-left rounded-xl overflow-hidden bg-card hover:bg-card/80 border border-border hover:border-ring/30 transition-all duration-200">
      <div className="aspect-[2/3] overflow-hidden relative bg-muted">
        <CoverImage src={imgSrc} alt={title} />
        {item.status && (
          <span className="absolute top-1.5 left-1.5 text-[10px] bg-black/70 backdrop-blur text-gray-300 px-1.5 py-0.5 rounded-md">
            {item.status}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-end p-2">
          <ExternalLink size={14} className="text-white/80" />
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-foreground group-hover:text-foreground/90 line-clamp-2 leading-snug">{title}</p>
        {(item.author || item.artist) && (
          <p className="text-[10px] text-muted-foreground truncate mt-1">{item.author || item.artist}</p>
        )}
      </div>
    </button>
  );
}

function DetailPanel({ data }) {
  const { t } = useTranslation();
  const imgSrc = data.imageUrl || data.image || data.cover;
  return (
    <div className="flex gap-6 p-6 max-w-2xl mx-auto">
      <div className="w-36 h-52 rounded-xl overflow-hidden bg-muted shrink-0 shadow-xl">
        <CoverImage src={imgSrc} alt={data.title} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-foreground mb-1 leading-tight">{data.title || data.name}</h2>
        {data.author && <p className="text-sm text-muted-foreground mb-3">by {data.author}</p>}
        {data.status && (
          <span className="inline-block text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-full mb-3">{data.status}</span>
        )}
        {data.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-4">{data.description}</p>
        )}
        {(data.genre || data.genres || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(data.genre || data.genres).map((g, i) => (
              <span key={i} className="text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full border border-border">{g}</span>
            ))}
          </div>
        )}
        {data.chapters?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
              {t('results.chapters', { count: data.chapters.length })}
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {data.chapters.slice(0, 50).map((ch, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-secondary/50 rounded-lg text-xs hover:bg-secondary transition-colors">
                  <BookOpen size={10} className="text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate text-foreground/80">{ch.name || ch.title || `Chapter ${ch.number ?? i + 1}`}</span>
                  {ch.dateUpload && <span className="text-[10px] text-muted-foreground">{ch.dateUpload}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.episodes?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
              {t('results.episodes', { count: data.episodes.length })}
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {data.episodes.slice(0, 50).map((ep, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-secondary/50 rounded-lg text-xs hover:bg-secondary transition-colors">
                  <Play size={10} className="text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate text-foreground/80">{ep.name || ep.title || `Episode ${ep.number ?? i + 1}`}</span>
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
    <pre className="p-4 text-xs font-mono text-emerald-400/90 bg-black/20 rounded-xl overflow-auto leading-relaxed border border-border max-h-full">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function getItems(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  for (const k of ['list', 'results', 'manga', 'anime', 'data']) {
    if (result[k] && Array.isArray(result[k])) return result[k];
  }
  return [];
}

export default function ResultGrid({ result, error, running }) {
  const { t } = useTranslation();
  const [view, setView]       = useState('grid');
  const [selected, setSelected] = useState(null);

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="text-sm">{t('results.running')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex items-start gap-4 p-5 bg-destructive/5 border border-destructive/20 rounded-xl">
          <div className="w-9 h-9 bg-destructive/15 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-destructive text-sm mb-1.5">{error.name || 'RuntimeError'}</p>
            <p className="text-sm text-foreground/80 font-mono leading-relaxed mb-3 whitespace-pre-wrap">{error.message}</p>
            {error.stack && (
              <pre className="text-[11px] text-muted-foreground font-mono bg-muted/50 p-3 rounded-lg overflow-auto max-h-48 border border-border leading-relaxed">
                {error.stack}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none">
        <span className="text-5xl">🗼</span>
        <p className="text-sm font-medium">{t('results.noResult')}</p>
        <p className="text-xs text-muted-foreground/60">{t('results.resultsWillAppear')}</p>
      </div>
    );
  }

  const items = getItems(result);
  const isDetail   = result && !Array.isArray(result) && (result.chapters || result.episodes || result.description !== undefined) && !result.list;
  const isPageList = Array.isArray(result) && result.length > 0 && typeof result[0] === 'string';
  const isVideoList= Array.isArray(result) && result.length > 0 && (result[0]?.url || result[0]?.videoUrl || result[0]?.quality);

  if (selected) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="sticky top-0 z-10 px-4 pt-4 pb-3 bg-gradient-to-b from-background via-background/95 to-transparent">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
            <ChevronLeft size={13} />
            {t('results.backToResults')}
          </button>
        </div>
        <DetailPanel data={selected} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-background/95 backdrop-blur border-b border-border">
        <span className="text-xs text-muted-foreground font-medium">
          {items.length > 0 ? t('results.items', { count: items.length }) : 'Result'}
        </span>
        {items.length > 0 && (
          <div className="flex gap-0.5 bg-secondary p-0.5 rounded-md">
            {[['grid', LayoutGrid], ['raw', Code2]].map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                className={cn('p-1 rounded transition-colors', view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <Icon size={13} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="p-4">
        {view === 'raw' || isPageList || isVideoList
          ? <RawJson data={result} />
          : isDetail
            ? <DetailPanel data={result} />
            : items.length > 0
              ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
                  {items.map((item, i) => <MediaCard key={i} item={item} onOpen={setSelected} />)}
                </div>
              : <RawJson data={result} />
        }
      </div>
    </div>
  );
}
