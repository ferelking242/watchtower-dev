import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
      <img
        src={proxied} alt={alt}
        className={cn('w-full h-full object-cover transition-opacity duration-300', state === 'ok' ? 'opacity-100' : 'opacity-0')}
        onLoad={() => setState('ok')}
        onError={() => setState('err')}
      />
    </div>
  );
}

export function MediaCard({ item, onClick }) {
  const imgSrc = item.imageUrl || item.image || item.cover || item.thumbnail || item.poster;
  const title  = item.title || item.name || '—';
  return (
    <button
      onClick={() => onClick?.(item)}
      className="group text-left rounded-xl overflow-hidden bg-card border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer"
    >
      <div className="aspect-[2/3] overflow-hidden relative bg-muted">
        <CoverImage src={imgSrc} alt={title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        {item.status && (
          <span className="absolute top-2 left-2 text-[10px] bg-black/70 text-white/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
            {item.status}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">{title}</p>
        {(item.author || item.artist) && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.author || item.artist}</p>
        )}
      </div>
    </button>
  );
}

export function getItemsFromResult(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  for (const k of ['list', 'results', 'manga', 'anime', 'data', 'items']) {
    if (result[k] && Array.isArray(result[k])) return result[k];
  }
  return [];
}

export default function ResultGrid({ items, onItemClick }) {
  const { t } = useTranslation();
  if (!items || items.length === 0) return null;
  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center px-4 py-2 bg-background/95 backdrop-blur border-b border-border">
        <span className="text-xs text-muted-foreground font-medium">
          {t('results.items', { count: items.length })}
        </span>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
        {items.map((item, i) => (
          <MediaCard key={i} item={item} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
}
