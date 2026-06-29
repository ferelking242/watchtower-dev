import React, { useState, useCallback, useRef } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { Sidebar, type Extension } from "./components/Sidebar";
import { Home, type MediaItem, getItemUrl, getItemList } from "./components/Home";
import { DetailView } from "./components/DetailView";
import { MangaReader } from "./components/MangaReader";
import { VideoPlayer } from "./components/VideoPlayer";
import { FloatingConsole, type LogEntry } from "./components/DevConsole";
import "./i18n/index";

type View = "home" | "detail" | "reader" | "player";

interface RunState {
  popular: { loading: boolean; items: MediaItem[]; error: string | null };
  latest: { loading: boolean; items: MediaItem[]; error: string | null };
  search: { loading: boolean; items: MediaItem[]; error: string | null };
}

function initialRunState(): RunState {
  return {
    popular: { loading: false, items: [], error: null },
    latest: { loading: false, items: [], error: null },
    search: { loading: false, items: [], error: null },
  };
}

function getPageList(result: unknown): { url?: string; imageUrl?: string; img?: string }[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as { url?: string; imageUrl?: string; img?: string }[];
  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>;
    for (const key of ["pages", "list", "images", "imageUrls", "data", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as { url?: string; imageUrl?: string; img?: string }[];
    }
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return val as { url?: string; imageUrl?: string; img?: string }[];
    }
  }
  return [];
}

function getVideoSources(result: unknown): { url?: string; originalUrl?: string; quality?: string; label?: string; isM3U8?: boolean }[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as { url?: string; originalUrl?: string; quality?: string; label?: string; isM3U8?: boolean }[];
  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>;
    for (const key of ["videos", "sources", "list", "data", "streams", "links", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as { url?: string; originalUrl?: string; quality?: string; label?: string; isM3U8?: boolean }[];
    }
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return val as { url?: string; originalUrl?: string; quality?: string; label?: string; isM3U8?: boolean }[];
    }
  }
  return [];
}

const BASE_URL = import.meta.env.BASE_URL || "/";
function apiUrl(path: string): string {
  const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  if (base === "" || base === "/") return path;
  return `${base}${path}`;
}

function AppInner() {
  const [view, setView] = useState<View>("home");
  const [extension, setExtension] = useState<Extension | null>(null);
  const [extCode, setExtCode] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [runState, setRunState] = useState<RunState>(initialRunState());
  const [pages, setPages] = useState<{ url?: string; imageUrl?: string; img?: string }[]>([]);
  const [videoSources, setVideoSources] = useState<{ url?: string; originalUrl?: string; quality?: string; label?: string; isM3U8?: boolean }[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const addLogs = useCallback((newLogs: LogEntry[]) => {
    setLogs((prev) => [...prev, ...newLogs]);
  }, []);

  const runExtension = useCallback(async (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
    if (!extension || !extCode) throw new Error("No extension loaded");

    return new Promise<unknown>((resolve, reject) => {
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const source = {
        id: extension.id,
        lang: extension.lang,
        name: extension.name,
        baseUrl: extension.baseUrl,
        category: extension.category,
      };

      fetch(apiUrl("/api/wt/run"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: extCode, type: extension.type, source, method, params }),
        signal: ac.signal,
      }).then(async (resp) => {
        if (!resp.ok) {
          reject(new Error(`HTTP ${resp.status}`));
          return;
        }
        const reader = resp.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const flush = () => {
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "log") {
                const entry: LogEntry = { ts: event.ts || 0, type: event.type || "info", ...event };
                setLogs((prev) => [...prev, entry]);
              } else if (event.type === "done") {
                if (event.success) resolve(event.result);
                else reject(new Error(event.error?.message || "Run failed"));
              }
            } catch {}
          }
        };

        const readLoop = async () => {
          if (!reader) { reject(new Error("No body")); return; }
          while (true) {
            const { done, value } = await reader.read();
            if (done) { flush(); break; }
            buffer += decoder.decode(value, { stream: true });
            flush();
          }
        };
        readLoop().catch(reject);
      }).catch(reject);
    });
  }, [extension, extCode]);

  const loadExtensionCode = useCallback(async (ext: Extension): Promise<string> => {
    if (!ext.sourceCodeUrl) throw new Error("No source code URL");
    const resp = await fetch(apiUrl(`/api/wt/extensions/code?url=${encodeURIComponent(ext.sourceCodeUrl)}`));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json() as { code?: string };
    return data.code || "";
  }, []);

  const handleSelectExtension = useCallback(async (ext: Extension) => {
    setExtension(ext);
    setView("home");
    setExtCode(null);
    setRunState(initialRunState());
    setDetailData(null);

    try {
      const code = await loadExtensionCode(ext);
      setExtCode(code);

      setRunState((prev) => ({ ...prev, popular: { loading: true, items: [], error: null }, latest: { loading: true, items: [], error: null } }));

      const runWithCode = async (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
        return new Promise<unknown>((resolve, reject) => {
          const source = { id: ext.id, lang: ext.lang, name: ext.name, baseUrl: ext.baseUrl, category: ext.category };
          fetch(apiUrl("/api/wt/run"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, type: ext.type, source, method, params }),
          }).then(async (resp) => {
            if (!resp.ok) { reject(new Error(`HTTP ${resp.status}`)); return; }
            const reader = resp.body?.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            const readLoop = async () => {
              if (!reader) { reject(new Error("No body")); return; }
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() || "";
                for (const line of lines) {
                  if (!line.startsWith("data: ")) continue;
                  try {
                    const ev = JSON.parse(line.slice(6));
                    if (ev.type === "log") setLogs((prev) => [...prev, { ts: ev.ts || 0, type: ev.type, ...ev }]);
                    else if (ev.type === "done") { ev.success ? resolve(ev.result) : reject(new Error(ev.error?.message || "Run failed")); return; }
                  } catch {}
                }
              }
            };
            readLoop().catch(reject);
          }).catch(reject);
        });
      };

      const [popularResult, latestResult] = await Promise.allSettled([
        runWithCode("getPopular", { page: 1 }),
        runWithCode("getLatestUpdates", { page: 1 }).catch(() => null),
      ]);

      const popularItems = popularResult.status === "fulfilled" ? getItemList(popularResult.value) : [];
      const latestItems = latestResult.status === "fulfilled" && latestResult.value ? getItemList(latestResult.value) : [];

      setRunState({
        popular: {
          loading: false,
          items: popularItems,
          error: popularResult.status === "rejected" ? (popularResult.reason as Error).message : null,
        },
        latest: {
          loading: false,
          items: latestItems,
          error: latestResult.status === "rejected" ? (latestResult.reason as Error).message : null,
        },
        search: { loading: false, items: [], error: null },
      });
    } catch (e) {
      const msg = (e as Error).message;
      setRunState({
        popular: { loading: false, items: [], error: msg },
        latest: { loading: false, items: [], error: null },
        search: { loading: false, items: [], error: null },
      });
    }
  }, [loadExtensionCode]);

  const handleItemClick = useCallback((item: MediaItem) => {
    setSelectedItem(item);
    setView("detail");
  }, []);

  const handleChapterClick = useCallback(async (chapter: { url?: string; link?: string; name?: string; title?: string }, detail: Record<string, unknown>) => {
    const chUrl = chapter.url || chapter.link || "";
    setChapterTitle(chapter.name || chapter.title || "");
    setDetailData(detail);
    const isWatch = extension?.category === "watch";

    try {
      if (isWatch) {
        const result = await runExtension("getVideoList", { url: chUrl });
        const sources = getVideoSources(result);
        setVideoSources(sources);
        setView("player");
      } else {
        const result = await runExtension("getPageList", { url: chUrl });
        const pgs = getPageList(result);
        setPages(pgs);
        setView("reader");
      }
    } catch (e) {
      const msg = (e as Error).message;
      setLogs((prev) => [...prev, { ts: Date.now(), type: "error", message: `Chapter error: ${msg}` }]);
    }
  }, [extension, runExtension]);

  const handleRun = useCallback(async (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
    return runExtension(method, params);
  }, [runExtension]);

  const handleSearchRun = useCallback(async (query: string) => {
    setRunState((prev) => ({ ...prev, search: { loading: true, items: [], error: null } }));
    try {
      const result = await runExtension("search", { query, page: 1 });
      setRunState((prev) => ({ ...prev, search: { loading: false, items: getItemList(result), error: null } }));
    } catch (e) {
      setRunState((prev) => ({ ...prev, search: { loading: false, items: [], error: (e as Error).message } }));
    }
  }, [runExtension]);

  const proxyUrl = useCallback((url: string) => {
    if (!url || url.startsWith("data:")) return url;
    return apiUrl(`/api/wt/proxy?url=${encodeURIComponent(url)}`);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)", color: "var(--text-primary)" }}>
      <div style={{ width: 240, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--sidebar-bg)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Sidebar selectedExtension={extension} onSelectExtension={handleSelectExtension} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {view === "home" && (
          <Home
            extension={extension}
            onItemClick={handleItemClick}
            onRun={handleRun}
            onSearch={handleSearchRun}
            runState={runState}
          />
        )}
        {view === "detail" && selectedItem && extension && (
          <DetailView
            item={selectedItem}
            extension={extension}
            onBack={() => setView("home")}
            onChapterClick={handleChapterClick}
            onRun={handleRun}
          />
        )}
      </div>

      {view === "reader" && (
        <MangaReader
          pages={pages}
          title={selectedItem?.title as string || selectedItem?.name as string || ""}
          chapterTitle={chapterTitle}
          onBack={() => setView("detail")}
          proxyUrl={proxyUrl}
        />
      )}

      {view === "player" && (
        <VideoPlayer
          sources={videoSources}
          title={selectedItem?.title as string || selectedItem?.name as string || ""}
          episodeTitle={chapterTitle}
          onBack={() => setView("detail")}
          proxyUrl={proxyUrl}
        />
      )}

      <FloatingConsole
        logs={logs}
        onClear={() => setLogs([])}
        isRunning={runState.popular.loading || runState.latest.loading || runState.search.loading}
        open={consoleOpen}
        onOpen={() => setConsoleOpen(true)}
        onClose={() => setConsoleOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
