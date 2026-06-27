import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookOpen } from 'lucide-react';

export default function MangaReader({ pages = [] }) {
  const [page, setPage]   = useState(0);
  const [zoom, setZoom]   = useState(100);
  const [mode, setMode]   = useState('scroll'); // scroll | page

  const prev = useCallback(() => setPage(p => Math.max(0, p - 1)), []);
  const next = useCallback(() => setPage(p => Math.min(pages.length - 1, p + 1)), [pages.length]);

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
        <BookOpen size={32} className="opacity-30" />
        <p className="text-sm">Run getPageList to see manga pages here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-0">
      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-2 bg-surface-1 border-b border-white/5 shrink-0">
        <span className="text-xs text-gray-400">{pages.length} pages</span>
        <div className="flex gap-1 ml-auto items-center">
          <button onClick={() => setMode(m => m === 'scroll' ? 'page' : 'scroll')}
            className="text-xs px-2 py-1 bg-surface-3 rounded text-gray-400 hover:text-white transition-colors">
            {mode === 'scroll' ? 'Scroll' : 'Page'}
          </button>
          <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="p-1 text-gray-500 hover:text-white"><ZoomOut size={14} /></button>
          <span className="text-xs text-gray-500 w-10 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-1 text-gray-500 hover:text-white"><ZoomIn size={14} /></button>
        </div>
        {mode === 'page' && (
          <div className="flex items-center gap-2 ml-2">
            <button onClick={prev} disabled={page === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
            <span className="text-xs text-gray-400">{page + 1} / {pages.length}</span>
            <button onClick={next} disabled={page === pages.length - 1} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* Pages */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-2 p-4 bg-zinc-950">
        {mode === 'scroll' ? (
          pages.map((src, i) => (
            <PageImage key={i} src={src} zoom={zoom} page={i + 1} total={pages.length} />
          ))
        ) : (
          <PageImage src={pages[page]} zoom={zoom} page={page + 1} total={pages.length} />
        )}
      </div>
    </div>
  );
}

function PageImage({ src, zoom, page, total }) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr]       = useState(false);

  return (
    <div className="relative" style={{ width: `${zoom}%`, maxWidth: '100%' }}>
      {!loaded && !err && <div className="shimmer w-full" style={{ height: 600 }} />}
      {err ? (
        <div className="w-full h-64 flex flex-col items-center justify-center bg-surface-2 rounded text-gray-600 gap-2 text-sm">
          <span>⚠️ Could not load page {page}</span>
          <span className="text-xs font-mono break-all px-4 text-center text-gray-700">{src}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={`Page ${page}`}
          className={`w-full block rounded transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErr(true)}
          referrerPolicy="no-referrer"
        />
      )}
      <div className="absolute bottom-2 right-2 bg-black/60 text-xs text-gray-400 px-2 py-0.5 rounded">
        {page}/{total}
      </div>
    </div>
  );
}
