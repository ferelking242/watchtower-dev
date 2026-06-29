import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookOpen, LayoutList, Columns } from 'lucide-react';
import { cn } from '../lib/utils.js';

function proxyImg(src) {
  if (!src) return null;
  if (typeof src === 'object') src = src.url || src.imageUrl || src.img;
  if (!src) return null;
  return `/wt/proxy?url=${encodeURIComponent(src)}`;
}

function PageImage({ src, zoom, page, total }) {
  const [state, setState] = useState('loading');
  const proxied = proxyImg(src);
  return (
    <div className="relative" style={{ width: `${zoom}%`, maxWidth: '100%' }}>
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded min-h-32">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <img
        src={proxied} alt={`Page ${page}`}
        className={cn('w-full h-auto rounded-sm transition-opacity duration-200', state === 'ok' ? 'opacity-100' : 'opacity-0')}
        onLoad={() => setState('ok')}
        onError={() => setState('err')}
      />
      {state === 'err' && (
        <div className="flex items-center justify-center h-24 bg-muted/30 rounded text-xs text-muted-foreground">
          Page {page} failed to load
        </div>
      )}
      <span className="absolute bottom-2 right-2 text-[10px] bg-black/50 text-white/70 px-1.5 py-0.5 rounded-md backdrop-blur">
        {page} / {total}
      </span>
    </div>
  );
}

export default function MangaReader({ pages = [], onBack }) {
  const [page, setPage]   = useState(0);
  const [zoom, setZoom]   = useState(100);
  const [mode, setMode]   = useState('scroll');
  const containerRef = useRef(null);

  useEffect(() => { setPage(0); }, [pages]);

  const prev = useCallback(() => setPage(p => Math.max(0, p - 1)), []);
  const next = useCallback(() => setPage(p => Math.min(pages.length - 1, p + 1)), [pages.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next]);

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <BookOpen size={32} className="opacity-30" />
        <p className="text-sm">No pages to display</p>
        {onBack && (
          <button onClick={onBack} className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            <ChevronLeft size={12} /> Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border shrink-0 flex-wrap">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mr-1">
            <ChevronLeft size={12} />Back
          </button>
        )}
        <span className="text-xs text-muted-foreground font-medium">{pages.length} pages</span>
        <div className="flex gap-1 ml-auto items-center">
          {/* Mode toggle */}
          <button onClick={() => setMode(m => m === 'scroll' ? 'page' : 'scroll')}
            className="flex items-center gap-1.5 text-xs px-2 py-1 bg-secondary border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors">
            {mode === 'scroll' ? <LayoutList size={12} /> : <Columns size={12} />}
            {mode === 'scroll' ? 'Scroll' : 'Page'}
          </button>
          {/* Zoom */}
          <button onClick={() => setZoom(z => Math.max(50, z - 25))}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><ZoomOut size={13} /></button>
          <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 25))}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><ZoomIn size={13} /></button>
        </div>
        {/* Page mode nav */}
        {mode === 'page' && (
          <div className="flex items-center gap-2 border-l border-border pl-2 ml-1">
            <button onClick={prev} disabled={page === 0}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"><ChevronLeft size={15} /></button>
            <span className="text-xs text-muted-foreground font-medium w-16 text-center">{page + 1} / {pages.length}</span>
            <button onClick={next} disabled={page === pages.length - 1}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"><ChevronRight size={15} /></button>
          </div>
        )}
      </div>

      {/* Pages area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto bg-zinc-950 flex flex-col items-center py-4 gap-2">
        {mode === 'scroll' ? (
          pages.map((src, i) => <PageImage key={i} src={src} zoom={zoom} page={i + 1} total={pages.length} />)
        ) : (
          <PageImage src={pages[page]} zoom={zoom} page={page + 1} total={pages.length} />
        )}
      </div>
    </div>
  );
}
