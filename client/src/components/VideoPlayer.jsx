import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ChevronDown, ChevronLeft } from 'lucide-react';
import Hls from 'hls.js';
import { cn } from '../lib/utils.js';

export default function VideoPlayer({ sources = [], onBack }) {
  const videoRef  = useRef(null);
  const hlsRef    = useRef(null);
  const [selIdx, setSelIdx]     = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [muted, setMuted]       = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSrc, setShowSrc]   = useState(false);

  const src = sources[selIdx];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src?.url) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    const url = src.url;
    if (url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
    } else {
      video.src = url;
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [src]);

  const togglePlay = () => { const v = videoRef.current; if (!v) return; v.paused ? v.play() : v.pause(); };
  const fmt = (s) => { if (!s || isNaN(s)) return '0:00'; const m = Math.floor(s/60), sec = Math.floor(s%60); return `${m}:${sec.toString().padStart(2,'0')}`; };

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Play size={32} className="opacity-30" />
        <p className="text-sm">No video sources available</p>
        {onBack && (
          <button onClick={onBack} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            <ChevronLeft size={12} />Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Back bar */}
      {onBack && (
        <div className="flex items-center px-3 py-2 bg-card border-b border-border shrink-0">
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
            <ChevronLeft size={12} />Back
          </button>
          <span className="ml-3 text-xs text-muted-foreground">{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
        </div>
      )}
      {/* Video */}
      <div className="flex-1 flex items-center justify-center bg-zinc-950 overflow-hidden">
        <video
          ref={videoRef}
          className="max-w-full max-h-full"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={e => setProgress(e.target.currentTime)}
          onLoadedMetadata={e => setDuration(e.target.duration)}
          muted={muted}
          playsInline
        />
      </div>
      {/* Controls */}
      <div className="shrink-0 bg-card border-t border-border px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{fmt(progress)}</span>
          <input type="range" min={0} max={duration||100} value={progress} step={0.1}
            onChange={e => { if (videoRef.current) videoRef.current.currentTime = Number(e.target.value); }}
            className="flex-1 h-1 cursor-pointer accent-blue-500" />
          <span>{fmt(duration)}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={() => { setMuted(m => !m); if (videoRef.current) videoRef.current.muted = !muted; }}
            className="text-muted-foreground hover:text-foreground transition-colors">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button onClick={() => videoRef.current?.requestFullscreen?.()} className="text-muted-foreground hover:text-foreground ml-auto transition-colors">
            <Maximize size={14} />
          </button>
          <div className="relative">
            <button onClick={() => setShowSrc(s => !s)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-secondary border border-border px-2 py-1 rounded-md transition-colors">
              {src?.quality || 'Quality'} <ChevronDown size={11} />
            </button>
            {showSrc && (
              <div className="absolute bottom-9 right-0 bg-popover border border-border rounded-xl overflow-hidden shadow-xl z-20 min-w-36">
                {sources.map((s, i) => (
                  <button key={i} onClick={() => { setSelIdx(i); setShowSrc(false); }}
                    className={cn('w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors',
                      i === selIdx ? 'text-primary' : 'text-foreground')}>
                    {s.quality || `Source ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {src?.url && <p className="text-[10px] text-muted-foreground/50 font-mono truncate">{src.url}</p>}
      </div>
    </div>
  );
}
