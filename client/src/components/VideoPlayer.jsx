import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ChevronDown } from 'lucide-react';
import Hls from 'hls.js';

export default function VideoPlayer({ sources = [] }) {
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

    // Cleanup prev HLS
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

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
        <Play size={32} className="opacity-30" />
        <p className="text-sm">Run getVideoList to load video sources here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Video */}
      <div className="flex-1 flex items-center justify-center relative bg-zinc-950 overflow-hidden">
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
      <div className="shrink-0 bg-surface-1 border-t border-white/5 px-4 py-3 space-y-2">
        {/* Progress */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{fmt(progress)}</span>
          <input
            type="range" min={0} max={duration || 100} value={progress} step={0.1}
            onChange={e => { if (videoRef.current) videoRef.current.currentTime = Number(e.target.value); }}
            className="flex-1 h-1 accent-accent-blue cursor-pointer"
          />
          <span>{fmt(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center text-white">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={() => { setMuted(m => !m); if (videoRef.current) videoRef.current.muted = !muted; }}
            className="text-gray-400 hover:text-white">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button onClick={() => videoRef.current?.requestFullscreen?.()} className="text-gray-400 hover:text-white ml-auto">
            <Maximize size={14} />
          </button>

          {/* Quality selector */}
          <div className="relative">
            <button onClick={() => setShowSrc(s => !s)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-surface-3 px-2 py-1 rounded">
              {src?.quality || 'Quality'} <ChevronDown size={11} />
            </button>
            {showSrc && (
              <div className="absolute bottom-8 right-0 bg-surface-2 border border-white/10 rounded-xl overflow-hidden shadow-xl z-20 min-w-32">
                {sources.map((s, i) => (
                  <button key={i} onClick={() => { setSelIdx(i); setShowSrc(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-3 transition-colors ${i === selIdx ? 'text-accent-blue' : 'text-gray-300'}`}>
                    {s.quality || `Source ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Source URL */}
        {src?.url && (
          <p className="text-[10px] text-gray-700 font-mono truncate">{src.url}</p>
        )}
      </div>
    </div>
  );
}
