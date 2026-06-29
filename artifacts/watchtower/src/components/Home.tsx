import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, ChevronRight, AlertCircle, Loader, Play, Home as HomeIcon, TrendingUp, Clock, RefreshCw } from "lucide-react";
import type { Extension } from "./Sidebar";

export interface MediaItem {
  link?: string;
  url?: string;
  title?: string;
  name?: string;
  imageUrl?: string;
  coverUrl?: string;
  cover?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  poster?: string;
  image?: string;
  author?: string;
  status?: string | number;
  description?: string;
  genres?: string[];
  isNsfw?: boolean;
  [key: string]: unknown;
}

export function getItemList(result: unknown): MediaItem[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as MediaItem[];
  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>;
    for (const key of ["list", "results", "manga", "anime", "data", "items", "books", "novels", "contents"]) {
      if (Array.isArray(obj[key])) return obj[key] as MediaItem[];
    }
    for (const val of Object.values(obj)) {
      if (Array.isArray(val) && val.length > 0) return val as MediaItem[];
    }
  }
  return [];
}

export function getItemUrl(item: MediaItem): string {
  return item.link || item.url || "";
}

export function getItemTitle(item: MediaItem): string {
  return item.title || item.name || "";
}

export function getItemCover(item: MediaItem): string {
  return item.imageUrl || item.coverUrl || item.cover || item.thumbnail || item.thumbnailUrl || item.poster || item.image || "";
}

export function getProxyCover(cover: string): string {
  if (!cover || cover.startsWith("data:")) return cover;
  return `/api/wt/proxy?url=${encodeURIComponent(cover)}`;
}

function MediaCard({ item, onClick, size = "normal" }: { item: MediaItem; onClick: () => void; size?: "normal" | "large" }) {
  const [imgError, setImgError] = useState(false);
  const cover = getItemCover(item);
  const proxyCover = cover && !imgError ? getProxyCover(cover) : "";
  const title = getItemTitle(item);
  const w = size === "large" ? 140 : 110;

  return (
    <button
      onClick={onClick}
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", width: w, flexShrink: 0 }}
    >
      <div style={{ position: "relative", width: w, height: size === "large" ? 200 : 155, borderRadius: 8, overflow: "hidden", background: "var(--card-bg)", marginBottom: 6 }}>
        {proxyCover ? (
          <img
            src={proxyCover}
            alt={title}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxSizing: "border-box" }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.3, fontWeight: 600 }}>{title || "?"}</span>
          </div>
        )}
        {item.isNsfw && (
          <div style={{ position: "absolute", top: 4, right: 4, background: "#ef4444", borderRadius: 4, padding: "1px 4px", fontSize: 9, color: "#fff", fontWeight: 700 }}>18+</div>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-primary)", lineHeight: 1.3, fontWeight: 500, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", width: w }}>
        {title}
      </div>
    </button>
  );
}

function HeroSlider({ items, onItemClick, isWatch }: { items: MediaItem[]; onItemClick: (item: MediaItem) => void; isWatch: boolean }) {
  const [idx, setIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const heroes = items.slice(0, 8);

  const go = (i: number) => {
    setIdx((i + heroes.length) % heroes.length);
    setImgError(false);
  };

  useEffect(() => {
    if (heroes.length <= 1) return;
    timerRef.current = setInterval(() => { setIdx((p) => (p + 1) % heroes.length); setImgError(false); }, 5000);
    return () => clearInterval(timerRef.current);
  }, [heroes.length]);

  if (heroes.length === 0) return null;

  const item = heroes[idx];
  const cover = getItemCover(item);
  const proxyCover = cover && !imgError ? getProxyCover(cover) : "";
  const title = getItemTitle(item);

  return (
    <div style={{ position: "relative", height: 320, overflow: "hidden", borderRadius: 0, flexShrink: 0 }}>
      {proxyCover && (
        <img
          src={proxyCover}
          alt=""
          onError={() => setImgError(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(2px) brightness(0.4)", transform: "scale(1.05)" }}
        />
      )}
      {!proxyCover && <div style={{ position: "absolute", inset: 0, background: "var(--card-bg)" }} />}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.85) 100%)" }} />

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 24px 20px", display: "flex", gap: 20, alignItems: "flex-end" }}>
        {proxyCover && (
          <img
            src={proxyCover}
            alt={title}
            onError={() => setImgError(true)}
            style={{ width: 90, height: 130, objectFit: "cover", borderRadius: 8, flexShrink: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.6)" }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 12, textShadow: "0 2px 8px rgba(0,0,0,0.6)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {title}
          </div>
          <button
            onClick={() => onItemClick(item)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", border: "none", borderRadius: 8, padding: "8px 18px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            {isWatch ? <><Play size={14} fill="currentColor" /> Regarder</> : <><Play size={14} fill="currentColor" /> Lire</>}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingBottom: 4 }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{idx + 1}/{heroes.length}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {heroes.map((_, i) => (
              <button key={i} onClick={() => go(i)} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, background: i === idx ? "#fff" : "rgba(255,255,255,0.35)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s" }} />
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => go(idx - 1)} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>‹</button>
      <button onClick={() => go(idx + 1)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>›</button>
    </div>
  );
}

function HorizontalRow({ title, items, onItemClick, onSeeAll, loading, error }: { title: string; items: MediaItem[]; onItemClick: (item: MediaItem) => void; onSeeAll: () => void; loading?: boolean; error?: string | null }) {
  const rowRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div style={{ marginBottom: 28 }}>
        <SectionHeader title={title} onSeeAll={onSeeAll} count={0} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13, height: 160 }}>
          <Loader size={14} className="spin" /> Chargement…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginBottom: 28 }}>
        <SectionHeader title={title} onSeeAll={onSeeAll} count={0} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontSize: 12 }}><AlertCircle size={14} />{error}</div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <SectionHeader title={title} onSeeAll={onSeeAll} count={items.length} />
      <div ref={rowRef} style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "thin" }}>
        {items.map((item, i) => (
          <MediaCard key={i} item={item} onClick={() => onItemClick(item)} size="large" />
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title, onSeeAll, count }: { title: string; onSeeAll: () => void; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h2>
      {count > 0 && (
        <button onClick={onSeeAll} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 12, display: "flex", alignItems: "center", gap: 3, fontWeight: 500 }}>
          Voir plus <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px 0 8px" }}>
      <button
        onClick={onClick}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "10px 28px", cursor: loading ? "not-allowed" : "pointer",
          color: loading ? "var(--text-muted)" : "var(--accent)",
          fontSize: 13, fontWeight: 600, transition: "all 0.15s",
        }}
      >
        {loading ? <><Loader size={13} className="spin" /> Chargement…</> : "Charger plus"}
      </button>
    </div>
  );
}

function FullGrid({
  items, onItemClick, loading, error, title, hasNextPage, loadingMore, onLoadMore
}: {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  loading?: boolean;
  error?: string | null;
  title?: string;
  hasNextPage?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!hasNextPage || !onLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !loadingMore) onLoadMore(); },
      { threshold: 0.1, rootMargin: "100px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, loadingMore, onLoadMore]);

  if (loading) return <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13, padding: "40px 0" }}><Loader size={14} className="spin" />{t("loading")}</div>;
  if (error) return <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontSize: 13, padding: "20px 0" }}><AlertCircle size={14} />{error}</div>;
  if (items.length === 0) return <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>{t("noResults")}</div>;
  return (
    <div>
      {title && <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h2>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "14px 10px" }}>
        {items.map((item, i) => <MediaCard key={i} item={item} onClick={() => onItemClick(item)} />)}
      </div>
      {hasNextPage && onLoadMore && (
        <LoadMoreButton onClick={onLoadMore} loading={!!loadingMore} />
      )}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
}

type Tab = "accueil" | "popular" | "latest" | "latestupdates";

interface HomeProps {
  extension: Extension | null;
  onItemClick: (item: MediaItem) => void;
  onRun: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
  onSearch?: (query: string) => void;
  onLoadMorePopular?: () => void;
  onLoadMoreLatest?: () => void;
  runState: {
    popular: { loading: boolean; loadingMore?: boolean; items: MediaItem[]; error: string | null; hasNextPage?: boolean };
    latest: { loading: boolean; loadingMore?: boolean; items: MediaItem[]; error: string | null; hasNextPage?: boolean };
    search: { loading: boolean; items: MediaItem[]; error: string | null };
  };
}

export function Home({ extension, onItemClick, onSearch, runState, onLoadMorePopular, onLoadMoreLatest }: HomeProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("accueil");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { setTab("accueil"); setSearchQuery(""); setIsSearching(false); }, [extension?.id]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) { setIsSearching(true); setTab("popular"); onSearch?.(q); }
  }, [searchQuery, onSearch]);

  const clearSearch = () => { setSearchQuery(""); setIsSearching(false); };

  if (!extension) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "var(--text-muted)" }}>
        <div style={{ fontSize: 48 }}>📚</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)" }}>{t("selectExtension")}</div>
        <div style={{ fontSize: 13 }}>Choisissez une extension dans la barre latérale</div>
      </div>
    );
  }

  const isWatch = extension.category === "watch";

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "accueil", label: "Accueil", icon: <HomeIcon size={13} /> },
    { key: "popular", label: "Popular", icon: <TrendingUp size={13} /> },
    { key: "latest", label: "Latest", icon: <Clock size={13} /> },
    { key: "latestupdates", label: "Latest Updates", icon: <RefreshCw size={13} /> },
  ];

  const activeTab = isSearching ? "popular" : tab;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px 0", background: "var(--sidebar-bg)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, fontWeight: 700, fontSize: 15, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {extension.name}
          </div>
          <span style={{ fontSize: 10, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px", color: "var(--text-muted)", fontWeight: 600 }}>
            {extension.lang.toUpperCase()} · {extension.category}
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, marginBottom: 0 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder={`Rechercher dans ${extension.name}`}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) { setIsSearching(false); } }}
              style={{ width: "100%", padding: "8px 32px 8px 30px", boxSizing: "border-box", background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none" }}
            />
            {searchQuery && <button type="button" onClick={clearSearch} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}><X size={12} /></button>}
          </div>
          <button type="submit" style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>Search</button>
        </form>

        <div style={{ display: "flex", gap: 4, marginTop: 10, overflowX: "auto", scrollbarWidth: "none" }}>
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setIsSearching(false); setSearchQuery(""); }}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 14px",
                borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", whiteSpace: "nowrap",
                fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                background: activeTab === key ? "var(--accent)" : "transparent",
                color: activeTab === key ? "#fff" : "var(--text-muted)",
              }}
            >
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "accueil" && !isSearching && (
          <div>
            {(runState.popular.loading || runState.popular.items.length > 0) && (
              <HeroSlider
                items={runState.popular.items}
                onItemClick={onItemClick}
                isWatch={isWatch}
              />
            )}
            {runState.popular.loading && runState.popular.items.length === 0 && (
              <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card-bg)", color: "var(--text-muted)", gap: 8 }}>
                <Loader size={16} className="spin" /> Chargement…
              </div>
            )}
            <div style={{ padding: "20px 16px" }}>
              <HorizontalRow
                title="Popular"
                items={runState.popular.items}
                onItemClick={onItemClick}
                onSeeAll={() => setTab("popular")}
                loading={runState.popular.loading}
                error={runState.popular.error}
              />
              <HorizontalRow
                title="Latest Updates"
                items={runState.latest.items}
                onItemClick={onItemClick}
                onSeeAll={() => setTab("latest")}
                loading={runState.latest.loading}
                error={runState.latest.error}
              />
            </div>
          </div>
        )}

        {activeTab === "popular" && (
          <div style={{ padding: "20px 16px" }}>
            {isSearching ? (
              <FullGrid
                items={runState.search.items}
                onItemClick={onItemClick}
                loading={runState.search.loading}
                error={runState.search.error}
                title={`"${searchQuery}"`}
              />
            ) : (
              <FullGrid
                items={runState.popular.items}
                onItemClick={onItemClick}
                loading={runState.popular.loading}
                error={runState.popular.error}
                title="Popular"
                hasNextPage={runState.popular.hasNextPage}
                loadingMore={runState.popular.loadingMore}
                onLoadMore={onLoadMorePopular}
              />
            )}
          </div>
        )}

        {(activeTab === "latest" || activeTab === "latestupdates") && (
          <div style={{ padding: "20px 16px" }}>
            <FullGrid
              items={runState.latest.items}
              onItemClick={onItemClick}
              loading={runState.latest.loading}
              error={runState.latest.error}
              title="Latest Updates"
              hasNextPage={runState.latest.hasNextPage}
              loadingMore={runState.latest.loadingMore}
              onLoadMore={onLoadMoreLatest}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export { getItemUrl as default };
