import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, ChevronRight, Settings, Moon, Sun, Languages, X, Filter, RefreshCw } from "lucide-react";
import { useTheme, type AccentColor } from "../context/ThemeContext";

export interface Extension {
  id: number;
  name: string;
  lang: string;
  type: string;
  category: string;
  sourceCodeUrl: string | null;
  iconUrl: string | null;
  baseUrl: string;
  version: string;
  isNsfw: boolean;
  hasCloudflare: boolean;
  paywall: string;
  requiresAccount: boolean;
  isAggregator: boolean;
  notes: string;
  subCategories: string[];
}

interface SidebarProps {
  selectedExtension: Extension | null;
  onSelectExtension: (ext: Extension) => void;
}

const CATEGORIES = ["all", "manga", "watch", "novel", "game", "music"] as const;
const ACCENT_COLORS: AccentColor[] = ["blue", "purple", "green", "orange", "pink", "red"];

function groupByLang(exts: Extension[]): Map<string, Extension[]> {
  const map = new Map<string, Extension[]>();
  for (const ext of exts) {
    const key = ext.lang || "all";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ext);
  }
  const sorted = new Map([...map.entries()].sort((a, b) => {
    if (a[0] === "en") return -1;
    if (b[0] === "en") return 1;
    if (a[0] === "all" || a[0] === "multi") return -1;
    if (b[0] === "all" || b[0] === "multi") return 1;
    return a[0].localeCompare(b[0]);
  }));
  return sorted;
}

export function Sidebar({ selectedExtension, onSelectExtension }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const { mode, accent, toggle, setAccent } = useTheme();
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [showNsfw, setShowNsfw] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [grouped, setGrouped] = useState<Map<string, Extension[]>>(new Map());

  const fetchExtensions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ category, nsfw: showNsfw ? "true" : "false" });
      const resp = await fetch(`/api/wt/extensions/list?${params}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: Extension[] = await resp.json();
      setExtensions(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [category, showNsfw]);

  useEffect(() => { fetchExtensions(); }, [fetchExtensions]);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? extensions.filter((e) => e.name.toLowerCase().includes(q) || e.lang.toLowerCase().includes(q))
      : extensions;
    const jsOnly = filtered.filter((e) => e.type === "js");
    setGrouped(groupByLang(jsOnly));
  }, [extensions, search]);

  const langLabel = (lang: string) =>
    lang === "all" || lang === "multi" ? lang.toUpperCase() : lang.toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
            {t("appName")}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={fetchExtensions} title="Refresh" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, display: "flex" }}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>
            <button onClick={() => setShowSettings(!showSettings)} style={{ background: "none", border: "none", cursor: "pointer", color: showSettings ? "var(--accent)" : "var(--text-muted)", padding: 4, borderRadius: 6, display: "flex" }}>
              <Settings size={15} />
            </button>
          </div>
        </div>

        {showSettings && (
          <div style={{ background: "var(--card-bg)", borderRadius: 8, padding: 10, marginBottom: 10, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("settings")}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("theme")}</span>
              <button onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--sidebar-bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, color: "var(--text-primary)" }}>
                {mode === "dark" ? <Moon size={12} /> : <Sun size={12} />}
                {mode === "dark" ? t("dark") : t("light")}
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("language")}</span>
              <button onClick={() => i18n.changeLanguage(i18n.language === "en" ? "fr" : "en")}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--sidebar-bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, color: "var(--text-primary)" }}>
                <Languages size={12} />
                {i18n.language.toUpperCase()}
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Accent</span>
              <div style={{ display: "flex", gap: 4 }}>
                {ACCENT_COLORS.map((c) => (
                  <button key={c} onClick={() => setAccent(c)}
                    style={{ width: 18, height: 18, borderRadius: "50%", border: accent === c ? "2px solid var(--text-primary)" : "2px solid transparent", cursor: "pointer", padding: 0,
                      background: { blue:"#2563eb", purple:"#7c3aed", green:"#16a34a", orange:"#ea580c", pink:"#db2777", red:"#dc2626" }[c] || "#2563eb" }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ position: "relative", marginBottom: 8 }}>
          <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "7px 28px 7px 28px", boxSizing: "border-box",
              background: "var(--input-bg)", border: "1px solid var(--border)",
              borderRadius: 7, color: "var(--text-primary)", fontSize: 12, outline: "none",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
              <X size={12} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                flexShrink: 0, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                cursor: "pointer", border: "none",
                background: category === cat ? "var(--accent)" : "var(--card-bg)",
                color: category === cat ? "#fff" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >
              {t(`categories.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
        {loading && (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
            {t("loading")}
          </div>
        )}
        {error && (
          <div style={{ padding: "12px", color: "#ef4444", fontSize: 12, textAlign: "center" }}>
            {t("error")}: {error}
            <button onClick={fetchExtensions} style={{ display: "block", margin: "8px auto 0", background: "var(--accent)", border: "none", borderRadius: 6, padding: "4px 12px", color: "#fff", cursor: "pointer", fontSize: 11 }}>
              {t("retry")}
            </button>
          </div>
        )}
        {!loading && !error && grouped.size === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>{t("noResults")}</div>
        )}
        {[...grouped.entries()].map(([lang, exts]) => (
          <div key={lang} style={{ marginBottom: 4 }}>
            <div style={{ padding: "4px 6px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>
              {langLabel(lang)} <span style={{ fontWeight: 400, opacity: 0.6 }}>({exts.length})</span>
            </div>
            {exts.map((ext) => (
              <button
                key={ext.id}
                onClick={() => onSelectExtension(ext)}
                style={{
                  width: "100%", textAlign: "left", padding: "7px 8px",
                  background: selectedExtension?.id === ext.id ? "var(--accent-dim)" : "transparent",
                  border: selectedExtension?.id === ext.id ? "1px solid var(--accent)" : "1px solid transparent",
                  borderRadius: 7, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 2, transition: "all 0.1s",
                }}
              >
                {ext.iconUrl ? (
                  <img src={ext.iconUrl} alt="" width={22} height={22}
                    style={{ borderRadius: 4, flexShrink: 0, objectFit: "cover" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: 4, background: "var(--accent)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>
                    {ext.name[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: selectedExtension?.id === ext.id ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ext.name}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 1, flexWrap: "wrap" }}>
                    {ext.isNsfw && <span style={{ fontSize: 9, padding: "0 3px", borderRadius: 3, background: "#ef4444", color: "#fff" }}>NSFW</span>}
                    {ext.hasCloudflare && <span style={{ fontSize: 9, padding: "0 3px", borderRadius: 3, background: "#f59e0b", color: "#fff" }}>CF</span>}
                    {ext.paywall !== "free" && <span style={{ fontSize: 9, padding: "0 3px", borderRadius: 3, background: "#8b5cf6", color: "#fff" }}>$</span>}
                  </div>
                </div>
                {selectedExtension?.id === ext.id && <ChevronRight size={12} color="var(--accent)" />}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
