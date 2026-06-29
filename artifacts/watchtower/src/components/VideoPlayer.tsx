import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, AlertCircle, Loader } from "lucide-react";

interface VideoSource {
  url?: string;
  originalUrl?: string;
  quality?: string;
  label?: string;
  isM3U8?: boolean;
  headers?: Record<string, string>;
}

interface VideoPlayerProps {
  sources: VideoSource[];
  title?: string;
  episodeTitle?: string;
  onBack: () => void;
  proxyUrl?: (url: string) => string;
}

function proxify(url: string, proxyFn?: (u: string) => string): string {
  if (!url) return url;
  if (proxyFn) return proxyFn(url);
  return `/api/wt/proxy?url=${encodeURIComponent(url)}`;
}

function isHLS(src: VideoSource): boolean {
  const u = src.url || src.originalUrl || "";
  return src.isM3U8 === true || u.includes(".m3u8") || u.includes("/hls/") || u.includes("playlist");
}

export function VideoPlayer({ sources, title, episodeTitle, onBack, proxyUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSrcIdx, setCurrentSrcIdx] = useState(0);
  const [showQuality, setShowQuality] = useState(false);

  const validSources = sources.filter((s) => s.url || s.originalUrl);
  const currentSrc = validSources[currentSrcIdx] || null;

  const resetHide = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      (hlsRef.current as { destroy: () => void }).destroy();
      hlsRef.current = null;
    }
  }, []);

  const loadSource = useCallback(async (src: VideoSource) => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);
    setLoading(true);
    setPlaying(false);
    destroyHls();

    const rawUrl = src.url || src.originalUrl || "";
    if (!rawUrl) { setError("No video URL"); setLoading(false); return; }

    if (isHLS(src)) {
      try {
        const HlsMod = await import("hls.js");
        const Hls = HlsMod.default;

        if (Hls.isSupported()) {
          const proxied = proxify(rawUrl, proxyUrl);
          const hls = new Hls({
            enableWorker: false,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            xhrSetup: (xhr: XMLHttpRequest, xhrUrl: string) => {
              if (src.headers) {
                Object.entries(src.headers).forEach(([k, v]) => {
                  try { xhr.setRequestHeader(k, v); } catch {}
                });
              }
              if (!xhrUrl.includes("/api/wt/proxy")) {
                const newUrl = proxify(xhrUrl, proxyUrl);
                Object.defineProperty(xhr, "_url", { get: () => newUrl, configurable: true });
              }
            },
          });

          hls.loadSource(proxied);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            video.play().catch(() => {});
          });

          hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal?: boolean; type?: string; details?: string }) => {
            if (data.fatal) {
              setLoading(false);
              setError(`HLS error: ${data.details || data.type || "fatal"}`);
            }
          });

          hlsRef.current = hls;
          return;
        }

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = rawUrl;
          video.play().catch(() => {});
          return;
        }

        setError("HLS non supporté sur ce navigateur");
        setLoading(false);
        return;
      } catch (e) {
        setError(`HLS load error: ${(e as Error).message}`);
        setLoading(false);
        return;
      }
    }

    const proxied = proxify(rawUrl, proxyUrl);
    video.src = proxied;
    video.load();
    video.play().catch(() => {});
  }, [proxyUrl, destroyHls]);

  useEffect(() => {
    if (currentSrc) loadSource(currentSrc);
    resetHide();
    return () => { clearTimeout(hideTimer.current); destroyHls(); };
  }, [currentSrc, loadSource, resetHide, destroyHls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onTimeUpdate = () => {
      setProgress(video.currentTime);
      setDuration(video.duration || 0);
    };
    const onEnded = () => setPlaying(false);
    const onError = () => {
      const err = video.error;
      if (err) setError(`Erreur vidéo (${err.code}): ${err.message}`);
      setLoading(false);
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if (e.key === "Escape") { if (fullscreen) document.exitFullscreen?.(); else onBack(); }
      if (e.key === " ") { e.preventDefault(); video.paused ? video.play() : video.pause(); }
      if (e.key === "ArrowRight") video.currentTime = Math.min(video.currentTime + 10, video.duration);
      if (e.key === "ArrowLeft") video.currentTime = Math.max(video.currentTime - 10, 0);
      if (e.key === "m") { video.muted = !video.muted; setMuted(video.muted); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack, fullscreen]);

  useEffect(() => {
    const handleFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (v) { v.volume = val; v.muted = val === 0; setMuted(val === 0); }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    const val = parseFloat(e.target.value);
    if (v && isFinite(val)) { v.currentTime = val; setProgress(val); }
  };

  const handleFullscreen = () => {
    if (!fullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHide}
      onTouchStart={resetHide}
      onClick={() => { resetHide(); setShowQuality(false); }}
      style={{ position: "fixed", inset: 0, zIndex: 900, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
    >
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 910, padding: "14px 16px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)",
        display: "flex", alignItems: "center", gap: 12,
        transition: "opacity 0.3s", opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none",
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", padding: 6 }}>
          <X size={20} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          {episodeTitle && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{episodeTitle}</div>}
        </div>
      </div>

      {loading && !error && (
        <div style={{ position: "absolute", zIndex: 905, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#fff" }}>
          <Loader size={32} className="spin" />
        </div>
      )}

      {error ? (
        <div style={{ color: "#fff", textAlign: "center", padding: 32, zIndex: 905, maxWidth: 400 }}>
          <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, marginBottom: 8, fontWeight: 600 }}>Lecture impossible</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>{error}</div>
          {currentSrc && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => loadSource(currentSrc)} style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <Play size={14} fill="currentColor" /> Réessayer
              </button>
              <a href={currentSrc.url || currentSrc.originalUrl || ""} target="_blank" rel="noreferrer"
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 13, textDecoration: "none" }}>
                Ouvrir lien direct
              </a>
            </div>
          )}
          {validSources.length > 1 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Essayer une autre source :</div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                {validSources.map((s, i) => (
                  <button key={i} onClick={() => { setCurrentSrcIdx(i); setError(null); }}
                    style={{ background: i === currentSrcIdx ? "var(--accent)" : "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "4px 10px", color: "#fff", cursor: "pointer", fontSize: 12 }}>
                    {s.quality || s.label || `Source ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <video
          ref={videoRef}
          onClick={togglePlay}
          muted={muted}
          playsInline
          crossOrigin="anonymous"
          style={{ maxWidth: "100%", width: "100%", height: "100%", objectFit: "contain", cursor: "pointer" }}
        />
      )}

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 910, padding: "12px 16px 16px",
        background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
        transition: "opacity 0.3s", opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none",
      }}>
        <input
          type="range" min={0} max={duration || 100} step={0.5} value={progress}
          onChange={handleSeek}
          style={{ width: "100%", accentColor: "var(--accent)", marginBottom: 10, cursor: "pointer" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={togglePlay} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}>
            {playing ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}
          </button>
          <button onClick={toggleMute} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{ width: 70, accentColor: "var(--accent)", cursor: "pointer" }}
          />
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, flexShrink: 0 }}>{fmt(progress)} / {fmt(duration)}</span>

          <div style={{ flex: 1 }} />

          {validSources.length > 1 && (
            <div style={{ position: "relative" }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowQuality((p) => !p); }}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "4px 10px", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
              >
                <Settings size={13} />
                {validSources[currentSrcIdx]?.quality || validSources[currentSrcIdx]?.label || "Qualité"}
              </button>
              {showQuality && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ position: "absolute", bottom: "100%", right: 0, marginBottom: 6, background: "rgba(0,0,0,0.9)", borderRadius: 8, overflow: "hidden", minWidth: 120, border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {validSources.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setCurrentSrcIdx(i); setShowQuality(false); setError(null); }}
                      style={{ display: "block", width: "100%", padding: "8px 12px", background: i === currentSrcIdx ? "var(--accent)" : "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, textAlign: "left" }}
                    >
                      {s.quality || s.label || `Source ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={handleFullscreen} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}>
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
