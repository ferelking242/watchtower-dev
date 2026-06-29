import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, Play, Star, Calendar, User, Tag, ExternalLink, Loader, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { MediaItem } from "./Home";
import type { Extension } from "./Sidebar";
import { getProxyCover } from "./Home";

interface Chapter {
  url?: string;
  link?: string;
  name?: string;
  title?: string;
  number?: number | string;
  scanlator?: string;
  dateUpload?: number | string;
  chapterNumber?: number | string;
}

interface DetailData {
  title?: string;
  name?: string;
  author?: string;
  artist?: string;
  description?: string;
  status?: string | number;
  genres?: string[];
  tags?: string[];
  imageUrl?: string;
  coverUrl?: string;
  cover?: string;
  thumbnail?: string;
  chapters?: Chapter[];
  episodes?: Chapter[];
  contents?: Chapter[];
  isNsfw?: boolean;
  [key: string]: unknown;
}

function normalizeChapters(detail: DetailData): Chapter[] {
  if (Array.isArray(detail.chapters) && detail.chapters.length > 0) return detail.chapters;
  if (Array.isArray(detail.episodes) && detail.episodes.length > 0) return detail.episodes;
  if (Array.isArray(detail.contents) && detail.contents.length > 0) return detail.contents;
  for (const val of Object.values(detail)) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object" && val[0] !== null && ("url" in (val[0] as object) || "link" in (val[0] as object))) {
      return val as Chapter[];
    }
  }
  return [];
}

function statusLabel(status: string | number | undefined, t: (k: string) => string): string {
  if (!status && status !== 0) return t("status.unknown");
  const s = String(status).toLowerCase();
  if (s === "1" || s === "ongoing" || s === "on going" || s === "publishing") return t("status.ongoing");
  if (s === "2" || s === "completed" || s === "finished") return t("status.completed");
  if (s === "3" || s === "hiatus" || s === "on hiatus") return t("status.hiatus");
  if (s === "4" || s === "cancelled" || s === "discontinued") return t("status.cancelled");
  return String(status) || t("status.unknown");
}

function chapterUrl(ch: Chapter): string {
  return ch.url || ch.link || "";
}

function chapterName(ch: Chapter): string {
  if (ch.name) return ch.name;
  if (ch.title) return ch.title;
  const num = ch.number || ch.chapterNumber;
  if (num !== undefined) return `Chapter ${num}`;
  return "Chapter";
}

interface DetailViewProps {
  item: MediaItem;
  extension: Extension;
  onBack: () => void;
  onChapterClick: (chapter: Chapter, detail: DetailData) => void;
  onRun: (method: string, params: Record<string, unknown>) => Promise<unknown>;
}

export function DetailView({ item, extension, onBack, onChapterClick, onRun }: DetailViewProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [chaptersExpanded, setChaptersExpanded] = useState(false);

  const itemUrl = item.link || item.url || "";
  const itemTitle = item.title || item.name || "";
  const itemCover = item.imageUrl || item.coverUrl || item.cover || item.thumbnail || "";

  useEffect(() => {
    if (!itemUrl) return;
    setLoading(true);
    setError(null);
    setDetail(null);
    onRun("getDetail", { url: itemUrl })
      .then((res) => {
        if (res && typeof res === "object") {
          setDetail(res as DetailData);
        } else {
          setError("No detail data returned");
        }
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [itemUrl]);

  const displayTitle = detail?.title || detail?.name || itemTitle;
  const displayCover = !imgError ? (detail?.imageUrl || detail?.coverUrl || detail?.cover || detail?.thumbnail || itemCover) : "";
  const proxyCover = displayCover ? getProxyCover(displayCover) : "";
  const chapters = detail ? normalizeChapters(detail) : [];
  const isWatch = extension.category === "watch";
  const displayedChapters = chaptersExpanded ? chapters : chapters.slice(0, 20);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4, borderRadius: 6 }}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayTitle}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 60, color: "var(--text-muted)" }}>
              <Loader size={20} className="spin" />
              <span>{t("loading")}</span>
            </div>
          )}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ef4444", padding: 20 }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}
          {!loading && !error && detail && (
            <div>
              <div style={{ display: "flex", gap: 24, marginBottom: 28, flexWrap: "wrap" }}>
                <div style={{ flexShrink: 0 }}>
                  {proxyCover ? (
                    <img
                      src={proxyCover}
                      alt={displayTitle}
                      onError={() => setImgError(true)}
                      style={{ width: 150, borderRadius: 10, display: "block", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                    />
                  ) : (
                    <div style={{ width: 150, height: 210, background: "var(--card-bg)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-muted)" }}>
                      {displayTitle}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{displayTitle}</h1>

                  {(detail.author || detail.artist) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "var(--text-secondary)", fontSize: 13 }}>
                      <User size={13} />
                      {detail.author || detail.artist}
                    </div>
                  )}

                  {detail.status !== undefined && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13 }}>
                      <Star size={13} color="var(--accent)" />
                      <span style={{ color: "var(--text-secondary)" }}>{t("detail.status")}:</span>
                      <span style={{ color: "var(--accent)", fontWeight: 500 }}>{statusLabel(detail.status, t)}</span>
                    </div>
                  )}

                  {(() => {
                    const genres = detail.genres || detail.tags;
                    if (!Array.isArray(genres) || genres.length === 0) return null;
                    return (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                        {(genres as string[]).slice(0, 12).map((g, i) => (
                          <span key={i} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 8px", fontSize: 11, color: "var(--text-secondary)" }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {detail.description && (
                    <div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, overflow: "hidden", maxHeight: descExpanded ? "none" : 80, position: "relative" }}>
                        {detail.description}
                        {!descExpanded && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: "linear-gradient(transparent, var(--bg))" }} />}
                      </div>
                      <button onClick={() => setDescExpanded(!descExpanded)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 12, padding: "4px 0", display: "flex", gap: 4, alignItems: "center" }}>
                        {descExpanded ? <><ChevronUp size={12} /> Less</> : <><ChevronDown size={12} /> More</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                    {isWatch ? <Play size={16} /> : <BookOpen size={16} />}
                    {isWatch ? t("detail.episodes") : t("detail.chapters")}
                    <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}>({chapters.length})</span>
                  </h2>
                </div>

                {chapters.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    {isWatch ? t("detail.noEpisodes") : t("detail.noChapters")}
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {displayedChapters.map((ch, i) => (
                        <button
                          key={i}
                          onClick={() => onChapterClick(ch, detail)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 14px", background: "var(--card-bg)",
                            border: "1px solid var(--border)", borderRadius: 8,
                            cursor: "pointer", textAlign: "left",
                            transition: "border-color 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{chapterName(ch)}</div>
                            {ch.scanlator && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{ch.scanlator}</div>}
                          </div>
                          {isWatch ? <Play size={14} color="var(--accent)" /> : <BookOpen size={14} color="var(--accent)" />}
                        </button>
                      ))}
                    </div>
                    {chapters.length > 20 && (
                      <button
                        onClick={() => setChaptersExpanded(!chaptersExpanded)}
                        style={{ width: "100%", marginTop: 8, padding: "8px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--accent)", fontSize: 12, fontWeight: 500 }}
                      >
                        {chaptersExpanded ? "Show less" : `Show all ${chapters.length} ${isWatch ? "episodes" : "chapters"}`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
