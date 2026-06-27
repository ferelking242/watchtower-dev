import React, { useState, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import TestRunner from './components/TestRunner.jsx';
import ResultGrid from './components/ResultGrid.jsx';
import DevConsole from './components/DevConsole.jsx';
import MangaReader from './components/MangaReader.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';
import { LayoutGrid, Terminal, BookOpen, Play } from 'lucide-react';

const TABS = [
  { id: 'results',  label: 'Results',  Icon: LayoutGrid },
  { id: 'console',  label: 'Console',  Icon: Terminal },
  { id: 'reader',   label: 'Reader',   Icon: BookOpen },
  { id: 'video',    label: 'Video',    Icon: Play },
];

export default function App() {
  const [extension, setExtension]     = useState(null); // { code, type, path, name, lang }
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
    setLogs([]);
    setResult(null);
    setError(null);
    setTiming(null);
  }, []);

  const handleRun = useCallback(async ({ method, params, source }) => {
    if (!extension) return;
    if (abortRef.current) abortRef.current.abort();

    clearState();
    setRunning(true);
    setActiveTab('results');

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const resp = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: extension.code,
          type: extension.type,
          source,
          method,
          params,
        }),
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
                setError(null);
                // Auto-switch tabs
                if (method === 'getPageList' && evt.result) {
                  const pages = extractPages(evt.result);
                  if (pages.length) { setReaderPages(pages); setActiveTab('reader'); }
                } else if (method === 'getVideoList' && evt.result) {
                  const vids = extractVideos(evt.result);
                  if (vids.length) { setVideoSrcs(vids); setActiveTab('video'); }
                }
              } else {
                setError(evt.error);
                setActiveTab('console');
              }
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError({ name: err.name, message: err.message });
        setActiveTab('console');
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [extension, clearState]);

  const handleStop = () => { abortRef.current?.abort(); setRunning(false); };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0 text-white font-sans">
      {/* Sidebar */}
      <Sidebar onExtensionLoad={setExtension} extension={extension} />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 h-12 bg-surface-1 border-b border-white/5 shrink-0">
          <span className="text-lg">🗼</span>
          <span className="font-bold text-sm tracking-wide text-white">Watchtower Dev</span>
          <span className="text-gray-600">|</span>
          {extension ? (
            <span className="flex items-center gap-2 text-sm">
              <span className={`tag tag-${extension.type}`}>{extension.type.toUpperCase()}</span>
              <span className="text-gray-300">{extension.name || extension.path?.split('/').pop()}</span>
              <span className="text-gray-500">[{extension.lang || '?'}]</span>
            </span>
          ) : (
            <span className="text-gray-500 text-sm">No extension loaded — pick one from the sidebar</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {timing !== null && (
              <span className="text-xs text-gray-500">{timing}ms</span>
            )}
            {running && (
              <button onClick={handleStop} className="btn-danger text-xs">
                Stop
              </button>
            )}
          </div>
        </header>

        {/* Test runner */}
        <TestRunner
          extension={extension}
          running={running}
          onRun={handleRun}
          result={result}
          error={error}
        />

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-white/5 shrink-0 bg-surface-0">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
                activeTab === id
                  ? 'border-accent-blue text-accent-blue bg-surface-1'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={13} />
              {label}
              {id === 'console' && logs.length > 0 && (
                <span className="ml-1 bg-surface-3 text-gray-400 rounded-full text-[10px] px-1.5">{logs.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content panels */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'results' && (
            <ResultGrid result={result} error={error} method={result ? undefined : undefined} running={running} />
          )}
          {activeTab === 'console' && (
            <DevConsole logs={logs} error={error} running={running} />
          )}
          {activeTab === 'reader' && (
            <MangaReader pages={readerPages} />
          )}
          {activeTab === 'video' && (
            <VideoPlayer sources={videoSrcs} />
          )}
        </div>
      </div>
    </div>
  );
}

function extractPages(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result.map(p => typeof p === 'string' ? p : p.url || p.imageUrl || '').filter(Boolean);
  if (result.pageList) return extractPages(result.pageList);
  if (result.pages) return extractPages(result.pages);
  return [];
}

function extractVideos(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result.map(v => typeof v === 'string' ? { url: v, quality: 'Unknown' } : { url: v.url || v.videoUrl || '', quality: v.quality || v.resolution || 'Unknown', headers: v.headers }).filter(v => v.url);
  if (result.videoList) return extractVideos(result.videoList);
  if (result.videos) return extractVideos(result.videos);
  return [];
}
