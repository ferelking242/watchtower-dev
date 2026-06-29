import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './context/ThemeContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TestRunner from './components/TestRunner.jsx';
import ResultGrid from './components/ResultGrid.jsx';
import DevConsole from './components/DevConsole.jsx';
import MangaReader from './components/MangaReader.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';
import {
  LayoutGrid, Terminal, BookOpen, Play, Clock,
  CheckCircle2, XCircle, Sun, Moon, Monitor,
  ChevronDown, Globe
} from 'lucide-react';
import { cn } from './lib/utils.js';
import i18n from './i18n/index.js';

const TABS = [
  { id: 'results', icon: LayoutGrid },
  { id: 'console', icon: Terminal },
  { id: 'reader',  icon: BookOpen  },
  { id: 'video',   icon: Play      },
];

function ThemeMenu() {
  const { mode, setMode, accent, setAccent, ACCENT_COLORS } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const modeIcons = { dark: Moon, light: Sun, system: Monitor };
  const ModeIcon = modeIcons[mode] || Moon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xs"
      >
        <ModeIcon size={13} />
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-popover border border-border rounded-lg shadow-xl z-50 p-1.5 animate-fade-in">
          <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('theme.color')}</p>
          <div className="flex gap-1.5 px-2 pb-2">
            {ACCENT_COLORS.map(a => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                title={a.label}
                style={{ background: a.hex }}
                className={cn('w-5 h-5 rounded-full transition-all', accent === a.id && 'ring-2 ring-offset-2 ring-offset-popover ring-white/60 scale-110')}
              />
            ))}
          </div>
          <div className="border-t border-border my-1" />
          {['dark', 'light', 'system'].map(m => {
            const Icon = modeIcons[m];
            return (
              <button
                key={m}
                onClick={() => { setMode(m); setOpen(false); }}
                className={cn('flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs transition-colors',
                  mode === m ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'
                )}
              >
                <Icon size={12} />
                {t(`theme.${m}`)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LangMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = i18n.language || 'en';

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xs"
      >
        <Globe size={13} />
        <span className="uppercase font-medium">{current}</span>
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-popover border border-border rounded-lg shadow-xl z-50 p-1 animate-fade-in">
          {['en', 'fr'].map(lng => (
            <button
              key={lng}
              onClick={() => { i18n.changeLanguage(lng); localStorage.setItem('wt-lang', lng); setOpen(false); }}
              className={cn('flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs transition-colors',
                current === lng ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'
              )}
            >
              {t(`lang.${lng}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  const [extension, setExtension]     = useState(null);
  const [running, setRunning]         = useState(false);
  const [logs, setLogs]               = useState([]);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [activeTab, setActiveTab]     = useState('results');
  const [readerPages, setReaderPages] = useState([]);
  const [videoSrcs, setVideoSrcs]     = useState([]);
  const [timing, setTiming]           = useState(null);
  const abortRef = useRef(null);

  const clearState = useCallback(() => {
    setLogs([]); setResult(null); setError(null); setTiming(null);
  }, []);

  const handleRun = useCallback(async ({ method, params, source }) => {
    if (!extension || running) return;
    if (abortRef.current) abortRef.current.abort();
    clearState();
    setRunning(true);
    setActiveTab('results');

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const resp = await fetch('/wt/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: extension.code, type: extension.type, source, method, params }),
        signal: ac.signal,
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(part.slice(6));
            if (evt.type === 'log') {
              setLogs(prev => [...prev, evt]);
            } else if (evt.type === 'done') {
              setTiming(evt.timing);
              if (evt.success) {
                setResult(evt.result);
                const items = getItems(evt.result);
                if (method === 'getPageList') {
                  setReaderPages(Array.isArray(evt.result) ? evt.result : items);
                  setActiveTab('reader');
                }
                if (method === 'getVideoList') {
                  setVideoSrcs(Array.isArray(evt.result) ? evt.result : items);
                  setActiveTab('video');
                }
              } else {
                setError(evt.error);
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError({ name: err.name, message: err.message });
    } finally {
      setRunning(false);
    }
  }, [extension, running, clearState]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 h-11 shrink-0 bg-sidebar border-b border-border z-20">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg leading-none">🗼</span>
          <span className="font-bold text-sm tracking-tight">{t('app.title')}</span>
          <span className="hidden sm:block text-[10px] text-muted-foreground font-medium border border-border rounded px-1.5 py-0.5">
            {t('app.subtitle')}
          </span>
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Active extension */}
        {extension ? (
          <div className="flex items-center gap-2 min-w-0">
            {extension.iconUrl && (
              <img src={extension.iconUrl} alt={extension.name}
                className="w-4 h-4 rounded object-cover shrink-0"
                onError={e => e.target.style.display = 'none'} />
            )}
            <span className="text-sm font-medium truncate">{extension.name}</span>
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0',
              extension.type === 'js'
                ? 'bg-yellow-500/15 text-yellow-400'
                : 'bg-blue-500/15 text-blue-400'
            )}>
              {extension.type?.toUpperCase()}
            </span>
            <span className="hidden md:block text-[10px] text-muted-foreground shrink-0">
              {extension.lang?.toUpperCase()} · {extension.category}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{t('runner.noExtension')}</span>
        )}

        {/* Timing */}
        {timing !== null && (
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
            <Clock size={11} />
            <span>{timing < 1000 ? `${timing}ms` : `${(timing/1000).toFixed(1)}s`}</span>
            {error
              ? <XCircle size={12} className="text-destructive" />
              : result !== null && <CheckCircle2 size={12} className="text-emerald-500" />
            }
          </div>
        )}

        <div className={cn('ml-auto flex items-center gap-1', timing !== null && 'ml-2')}>
          <LangMenu />
          <ThemeMenu />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onExtensionLoad={ext => { setExtension(ext); clearState(); }}
          extension={extension}
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          <TestRunner extension={extension} running={running} onRun={handleRun} />

          {/* Tabs */}
          <div className="flex items-center gap-0.5 px-4 border-b border-border bg-background shrink-0">
            {TABS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
                  activeTab === id
                    ? 'text-foreground border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
                )}
              >
                <Icon size={12} />
                {t(`results.${id}`)}
                {id === 'console' && logs.length > 0 && (
                  <span className="ml-0.5 text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {logs.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'results' && <ResultGrid result={result} error={error} running={running} />}
            {activeTab === 'console' && <DevConsole logs={logs} running={running} />}
            {activeTab === 'reader'  && <MangaReader pages={readerPages} />}
            {activeTab === 'video'   && <VideoPlayer sources={videoSrcs} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function getItems(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.list) return result.list;
  if (result.results) return result.results;
  return [];
}
