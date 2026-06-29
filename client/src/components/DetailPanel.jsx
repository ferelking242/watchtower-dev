import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Play, ChevronLeft, Loader, Tag, User, Clock, AlertCircle } from 'lucide-react';
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
      <div className="w-full h-full bg-muted flex items-center justify-center rounded-2xl">
        <span className="text-4xl opacity-20">🖼</span>
      </div>
    );
  }
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
      {state === 'loading' && <div className="absolute inset-0 bg-muted animate-pulse rounded-2xl" />}
      <img
        src={proxied} alt={alt}
        className={cn('w-full h-full object-cover transition-opacity duration-300', state === 'ok' ? 'opacity-100' : 'opacity-0')}
        onLoad={() => setState('ok')}
        onError={() => setState('err')}
      />
    </div>
  );
}

export default function DetailPanel({ data, loading, onBack, onChapter, onEpisode }) {
  const { t } = useTranslation();
  const [chapterSearch, setChapterSearch] = useState('');
  const [reversed, setReversed] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader size={28} className="animate-spin text-primary/60" />
        <span className="text-sm">Loading detail…</span>
      </div>
    );
  }
  if (!data) return null;

  const imgSrc  = data.imageUrl || data.image || data.cover || data.thumbnail;
  const title   = data.title || data.name || '—';
  const genres  = data.genre || data.genres || data.tags || [];
  const chapters = data.chapters || [];
  const episodes = data.episodes || [];
  const list = chapters.length > 0 ? chapters : episodes;
  const isAnime = episodes.length > 0;

  const filteredList = list
    .filter(c => !chapterSearch || (c.name || c.title || '').toLowerCase().includes(chapterSearch.toLowerCase()))
    .slice()
    [reversed ? 'reverse' : Symbol.iterator]();
  const displayList = Array.from(filteredList);

  return (
    <div className="h-full overflow-y-auto">
      {/* Back */}
      <div className="sticky top-0 z-10 flex items-center px-4 py-2.5 bg-background/95 backdrop-blur border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          <ChevronLeft size={14} />
          {t('results.backToResults')}
        </button>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {/* Hero */}
        <div className="flex gap-6 mb-8">
          {/* Cover */}
          <div className="w-36 h-52 md:w-44 md:h-64 shrink-0">
            <CoverImage src={imgSrc} alt={title} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">{title}</h1>

            <div className="flex flex-wrap gap-3 mb-4 text-sm text-muted-foreground">
              {(data.author || data.artist) && (
                <span className="flex items-center gap-1.5">
                  <User size={13} />
                  {data.author || data.artist}
                </span>
              )}
              {data.status && (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {data.status}
                </span>
              )}
              {list.length > 0 && (
                <span className="flex items-center gap-1.5">
                  {isAnime ? <Play size={13} /> : <BookOpen size={13} />}
                  {isAnime
                    ? t('results.episodes', { count: list.length })
                    : t('results.chapters', { count: list.length })}
                </span>
              )}
            </div>

            {data.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-4">{data.description}</p>
            )}

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {genres.slice(0, 12).map((g, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full border border-border">
                    <Tag size={9} />
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chapter / Episode list */}
        {list.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                {isAnime ? t('results.episodes', { count: list.length }) : t('results.chapters', { count: list.length })}
              </h2>
              <div className="flex items-center gap-2">
                <input
                  className="bg-secondary border border-border rounded-lg px-3 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring w-40 transition-colors"
                  placeholder="Search…"
                  value={chapterSearch}
                  onChange={e => setChapterSearch(e.target.value)}
                />
                <button
                  onClick={() => setReversed(r => !r)}
                  className="text-[10px] px-2.5 py-1 bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  {reversed ? '↑ Oldest' : '↓ Newest'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {displayList.map((item, i) => {
                const name = item.name || item.title || `${isAnime ? 'Episode' : 'Chapter'} ${i + 1}`;
                const date = item.dateUpload ? new Date(item.dateUpload * 1000).toLocaleDateString() : '';
                const scanlator = item.scanlator || '';
                return (
                  <button
                    key={i}
                    onClick={() => isAnime ? onEpisode?.(item) : onChapter?.(item)}
                    className="flex items-center gap-3 px-3 py-2.5 bg-card border border-border hover:border-primary/30 hover:bg-secondary/50 rounded-xl transition-all text-left group"
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                      isAnime
                        ? 'bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20'
                        : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                    )}>
                      {isAnime ? <Play size={14} /> : <BookOpen size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{name}</p>
                      {(date || scanlator) && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {[scanlator, date].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Raw fallback if no chapters/episodes */}
        {list.length === 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <AlertCircle size={12} />
              <span>No chapters or episodes found in response</span>
            </div>
            <pre className="text-[11px] font-mono text-emerald-400/80 bg-black/20 rounded-xl p-4 overflow-auto border border-border max-h-64">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
