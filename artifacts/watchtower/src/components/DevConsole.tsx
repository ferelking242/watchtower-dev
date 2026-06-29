import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Terminal, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export interface LogEntry {
  ts: number;
  type: string;
  message?: string;
  channel?: string;
  method?: string;
  url?: string;
  status?: number;
  error?: string;
  stack?: string;
}

interface DevConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
  isRunning?: boolean;
}

function typeColor(type: string): string {
  switch (type) {
    case "error": return "var(--log-error)";
    case "network_error": return "var(--log-error)";
    case "bridge_error": return "var(--log-error)";
    case "network": return "var(--log-network)";
    case "ext_log": return "var(--log-ext)";
    case "info": return "var(--log-info)";
    case "console": return "var(--log-console)";
    default: return "var(--text-muted)";
  }
}

function formatEntry(entry: LogEntry): string {
  const t = `+${entry.ts}ms`.padStart(8);
  if (entry.type === "network" || entry.type === "network_error") {
    const status = entry.status ? ` [${entry.status}]` : "";
    return `${t} ${entry.method || "HTTP"} ${entry.url || ""}${status}`;
  }
  if (entry.type === "bridge") return `${t} [bridge] ${entry.channel || ""}`;
  if (entry.type === "error" || entry.type === "bridge_error" || entry.type === "network_error") {
    return `${t} [error] ${entry.error || entry.message || ""}`;
  }
  return `${t} ${entry.message || entry.channel || ""}`;
}

export function DevConsolePanel({ logs, onClear, isRunning }: DevConsoleProps) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
          {t("console")} {logs.length > 0 && <span style={{ color: "var(--accent)", marginLeft: 4 }}>({logs.length})</span>}
          {isRunning && (
            <span style={{ marginLeft: 8, width: 8, height: 8, borderRadius: "50%", display: "inline-block", background: "var(--accent)", animation: "blink 1s infinite" }} />
          )}
        </span>
        <button onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px 6px", borderRadius: 4, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          <Trash2 size={12} />
          {t("clearConsole")}
        </button>
      </div>
      <div style={{
        flex: 1, overflowY: "auto", padding: "4px 0",
        fontFamily: "'Fira Code', 'Cascadia Code', monospace",
        fontSize: 11.5,
      }}>
        {logs.length === 0 ? (
          <div style={{ padding: "24px 16px", color: "var(--text-muted)", textAlign: "center" }}>{t("noLogs")}</div>
        ) : (
          logs.map((entry, i) => (
            <div key={i} style={{
              padding: "2px 12px",
              color: typeColor(entry.type),
              lineHeight: 1.6,
              wordBreak: "break-all",
              whiteSpace: "pre-wrap",
            }}>
              {formatEntry(entry)}
              {entry.stack && (
                <div style={{ color: "var(--log-error)", opacity: 0.7, paddingLeft: 24, fontSize: 10 }}>
                  {entry.stack.split("\n").slice(0, 3).join("\n")}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

interface FloatingConsoleProps extends DevConsoleProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function FloatingConsole({ logs, onClear, isRunning, open, onOpen, onClose }: FloatingConsoleProps) {
  const { t } = useTranslation();
  const [minimized, setMinimized] = useState(false);
  const newErrors = logs.filter((l) => l.type === "error" || l.type === "network_error" || l.type === "bridge_error").length;

  if (!open) {
    return (
      <button
        onClick={onOpen}
        title={t("console")}
        style={{
          position: "fixed", top: 16, right: 16, zIndex: 1000,
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "8px 12px",
          display: "flex", alignItems: "center", gap: 6,
          cursor: "pointer", color: "var(--text-primary)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          fontSize: 13, fontWeight: 500,
          transition: "all 0.15s",
        }}
      >
        <Terminal size={15} color="var(--accent)" />
        {logs.length > 0 && (
          <span style={{
            background: newErrors > 0 ? "#ef4444" : "var(--accent)",
            color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 11, fontWeight: 700,
          }}>
            {logs.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 1000,
      width: 420, background: "var(--sidebar-bg)",
      border: "1px solid var(--border)", borderRadius: 10,
      display: "flex", flexDirection: "column",
      boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      maxHeight: minimized ? 44 : 420,
      transition: "max-height 0.2s ease",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: minimized ? "none" : "1px solid var(--border)",
        cursor: "pointer", userSelect: "none", flexShrink: 0,
      }} onClick={() => setMinimized(!minimized)}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
          <Terminal size={14} color="var(--accent)" />
          {t("console")}
          {logs.length > 0 && (
            <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 10, padding: "0 6px", fontSize: 11 }}>
              {logs.length}
            </span>
          )}
          {isRunning && (
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "blink 1s infinite" }} />
          )}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {minimized ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronUp size={14} color="var(--text-muted)" />}
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, display: "flex" }}>
            <X size={14} />
          </button>
        </div>
      </div>
      {!minimized && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{
            flex: 1, overflowY: "auto",
            fontFamily: "'Fira Code', monospace", fontSize: 11,
            padding: "4px 0", maxHeight: 340,
          }}>
            {logs.length === 0 ? (
              <div style={{ padding: 16, color: "var(--text-muted)", textAlign: "center" }}>{t("noLogs")}</div>
            ) : (
              logs.slice(-200).map((e, i) => (
                <div key={i} style={{
                  padding: "1px 10px", color: typeColor(e.type),
                  lineHeight: 1.5, wordBreak: "break-all", whiteSpace: "pre-wrap",
                  fontSize: 10.5,
                }}>
                  {formatEntry(e)}
                </div>
              ))
            )}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", padding: "4px 10px", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 11, display: "flex", gap: 4, alignItems: "center" }}>
              <Trash2 size={11} /> {t("clearConsole")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
