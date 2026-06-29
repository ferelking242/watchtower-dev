import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw, AlignCenter } from "lucide-react";

interface Page {
  index?: number;
  url?: string;
  imageUrl?: string;
  img?: string;
}

interface MangaReaderProps {
  pages: Page[];
  title?: string;
  chapterTitle?: string;
  onBack: () => void;
  proxyUrl?: (url: string) => string;
}

function normalizeUrl(page: Page): string {
  return page.url || page.imageUrl || page.img || "";
}

export function MangaReader({ pages, title, chapterTitle, onBack, proxyUrl }: MangaReaderProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const [fitMode, setFitMode] = useState<"width" | "height" | "none">("width");
  const [showHeader, setShowHeader] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const resetHideTimer = useCallback(() => {
    setShowHeader(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowHeader(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, []);

  const goNext = useCallback(() => {
    if (currentPage < pages.length - 1) setCurrentPage((p) => p + 1);
  }, [currentPage, pages.length]);

  const goPrev = useCallback(() => {
    if (currentPage > 0) setCurrentPage((p) => p - 1);
  }, [currentPage]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onBack]);

  const currentUrl = pages[currentPage] ? normalizeUrl(pages[currentPage]) : "";
  const proxyedUrl = proxyUrl && currentUrl ? proxyUrl(currentUrl) : currentUrl;

  const imgStyle: React.CSSProperties = {
    display: "block",
    margin: "0 auto",
    maxWidth: fitMode === "width" ? "100%" : "none",
    height: fitMode === "height" ? "100vh" : "auto",
    width: fitMode === "none" ? "auto" : undefined,
    cursor: "pointer",
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      style={{
        position: "fixed", inset: 0, zIndex: 900,
        background: "#000",
        overflowY: "auto",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 910,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 12,
        transition: "opacity 0.3s",
        opacity: showHeader ? 1 : 0,
        pointerEvents: showHeader ? "auto" : "none",
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", padding: 4 }}>
          <X size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#fff" }}>{title}</div>
          {chapterTitle && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{chapterTitle}</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setFitMode("width")} title={t("reader.fitWidth")}
            style={{ background: fitMode === "width" ? "var(--accent)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, padding: "4px 10px", color: "#fff", cursor: "pointer", fontSize: 12 }}>
            <AlignCenter size={14} />
          </button>
          <button onClick={() => setFitMode("height")} title={t("reader.fitHeight")}
            style={{ background: fitMode === "height" ? "var(--accent)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, padding: "4px 10px", color: "#fff", cursor: "pointer", fontSize: 12 }}>
            <ZoomIn size={14} />
          </button>
          <button onClick={() => setFitMode("none")}
            style={{ background: fitMode === "none" ? "var(--accent)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, padding: "4px 10px", color: "#fff", cursor: "pointer", fontSize: 12 }}>
            <ZoomOut size={14} />
          </button>
        </div>
      </div>

      <div
        style={{ flex: 1, paddingTop: 48, paddingBottom: 80, minHeight: "100vh", cursor: "pointer" }}
        onClick={goNext}
      >
        {proxyedUrl ? (
          <img
            ref={imgRef}
            src={proxyedUrl}
            alt={`Page ${currentPage + 1}`}
            style={imgStyle}
            onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='600'><rect width='400' height='600' fill='%23111'/><text x='200' y='310' fill='%23555' text-anchor='middle' font-size='16'>Image unavailable</text></svg>"; }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", color: "#555" }}>
            No image
          </div>
        )}
      </div>

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 910,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "opacity 0.3s",
        opacity: showHeader ? 1 : 0,
        pointerEvents: showHeader ? "auto" : "none",
      }}>
        <button onClick={goPrev} disabled={currentPage === 0}
          style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, padding: "6px 14px", color: currentPage === 0 ? "#555" : "#fff", cursor: currentPage === 0 ? "default" : "pointer", display: "flex", gap: 4, alignItems: "center" }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>
          {t("reader.page", { current: currentPage + 1, total: pages.length })}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 160, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${((currentPage + 1) / pages.length) * 100}%`, height: "100%", background: "var(--accent)", transition: "width 0.2s" }} />
          </div>
          <button onClick={goNext} disabled={currentPage >= pages.length - 1}
            style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, padding: "6px 14px", color: currentPage >= pages.length - 1 ? "#555" : "#fff", cursor: currentPage >= pages.length - 1 ? "default" : "pointer", display: "flex", gap: 4, alignItems: "center" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
