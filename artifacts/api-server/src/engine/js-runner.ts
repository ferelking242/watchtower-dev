import vm from "node:vm";
import { BASE_API_JS } from "./base-api.js";
import { DomBridge } from "./dom-bridge.js";
import { HttpBridge } from "./http-bridge.js";

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

export interface RunResult {
  result: unknown;
  logs: LogEntry[];
  error: { name: string; message: string; stack?: string } | null;
  timing: number;
}

export interface RunOptions {
  code: string;
  source: Record<string, unknown>;
  method: string;
  params?: Record<string, unknown>;
  onLog?: (entry: LogEntry) => void;
  signal?: AbortSignal;
}

function safeStr(v: unknown): string {
  if (typeof v === "string") return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

function extractSource(code: string, userSource: Record<string, unknown>): Record<string, unknown> {
  try {
    const preamble = code.split(/\bclass\s+DefaultExtension\b/)[0] || "";
    const sandbox: Record<string, unknown> = { JSON };
    vm.createContext(sandbox);
    const snippet = `(function(){
      ${preamble}
      return typeof mangayomiSources !== 'undefined' ? JSON.stringify(mangayomiSources) : '[]';
    })()`;
    const raw = vm.runInContext(snippet, sandbox, { timeout: 2000 }) as string;
    const sources = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(sources) || sources.length === 0) return userSource || {};

    const lang = (userSource?.lang as string) || "en";
    const entry =
      sources.find((s) => s.lang === lang) ||
      sources.find((s) => Array.isArray(s.langs) && (s.langs as string[]).includes(lang)) ||
      sources[0];

    return {
      ...entry,
      ...(userSource?.id ? { id: userSource.id } : {}),
      ...(userSource?.lang ? { lang: userSource.lang } : {}),
      ...(userSource?.name ? { name: userSource.name } : {}),
      ...(userSource?.baseUrl && userSource.baseUrl !== "" ? { baseUrl: userSource.baseUrl } : {}),
    };
  } catch {
    return userSource || {};
  }
}

function buildCall(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case "getPopular":
      return `return JSON.stringify(await extention.getPopular(${Number(params.page) || 1}));`;
    case "getLatestUpdates":
      return `return JSON.stringify(await extention.getLatestUpdates(${Number(params.page) || 1}));`;
    case "search":
      return `return JSON.stringify(await extention.search(${JSON.stringify(params.query || "")}, ${Number(params.page) || 1}, []));`;
    case "getDetail":
      return `return JSON.stringify(await extention.getDetail(${JSON.stringify(params.url || "")}));`;
    case "getPageList":
      return `return JSON.stringify(await extention.getPageList(${JSON.stringify(params.url || "")}));`;
    case "getVideoList":
      return `return JSON.stringify(await extention.getVideoList(${JSON.stringify(params.url || "")}));`;
    case "getHtmlContent":
      return `return JSON.stringify(await extention.getHtmlContent(${JSON.stringify(params.name || "")}, ${JSON.stringify(params.url || "")}));`;
    case "getFilterList":
      return `return JSON.stringify(extention.getFilterList());`;
    case "getSourcePreferences":
      return `return JSON.stringify(extention.getSourcePreferences());`;
    case "supportsLatest":
      return `return JSON.stringify(extention.supportsLatest);`;
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

export async function runJsExtension(opts: RunOptions): Promise<RunResult> {
  const { code, source, method, params = {}, onLog, signal } = opts;
  const logs: LogEntry[] = [];
  const t0 = Date.now();

  function log(entry: Omit<LogEntry, "ts">): void {
    const e: LogEntry = { ts: Date.now() - t0, ...entry };
    logs.push(e);
    onLog?.(e);
  }

  const resolvedSource = extractSource(code, source);
  const dom = new DomBridge();
  const http = new HttpBridge((e) => log(e));

  async function sendMessage(channel: string, argsJson: string): Promise<string> {
    log({ type: "bridge", channel });
    try {
      if (channel.startsWith("http_")) {
        return await http.handle(channel, argsJson, signal);
      }
      if (channel === "ext_log") {
        const msg = (JSON.parse(argsJson) as unknown[])[0];
        log({ type: "ext_log", message: String(msg) });
        return "";
      }
      return dom.handle(channel, argsJson) as string;
    } catch (err) {
      const e = err as Error;
      log({ type: "bridge_error", channel, error: e.message });
      return "";
    }
  }

  function domMessage(channel: string, argsJson: string): unknown {
    try {
      return dom.handle(channel, argsJson);
    } catch (err) {
      const e = err as Error;
      log({ type: "bridge_error", channel, error: e.message });
      return "";
    }
  }

  const sharedPrefsStore: Record<string, unknown> = {};

  const consoleProxy = {
    log: (...a: unknown[]) => log({ type: "console", message: a.map(safeStr).join(" ") }),
    warn: (...a: unknown[]) => log({ type: "console", message: "[warn] " + a.map(safeStr).join(" ") }),
    error: (...a: unknown[]) => log({ type: "console", message: "[error] " + a.map(safeStr).join(" ") }),
    info: (...a: unknown[]) => log({ type: "console", message: "[info] " + a.map(safeStr).join(" ") }),
  };

  const sandbox: Record<string, unknown> = {
    sendMessage,
    domMessage,
    __sharedPrefsStore: sharedPrefsStore,
    console: consoleProxy,
    JSON, Promise, Error, TypeError, RangeError, SyntaxError, URIError, EvalError,
    Object, Array, String, Number, Boolean, Symbol, BigInt,
    RegExp, Map, Set, WeakMap, WeakSet, Date,
    Math, parseInt, parseFloat, isNaN, isFinite,
    encodeURIComponent, decodeURIComponent, encodeURI, decodeURI,
    setTimeout: (fn: () => void, ms: number) => new Promise<void>((r) => setTimeout(() => { fn(); r(); }, ms || 0)),
    clearTimeout: () => {},
    atob: (s: string) => Buffer.from(s, "base64").toString("utf8"),
    btoa: (s: string) => Buffer.from(s, "utf8").toString("base64"),
    TextDecoder, TextEncoder,
    AbortSignal, AbortController,
    Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array,
    Float32Array, Float64Array, ArrayBuffer,
  };

  vm.createContext(sandbox);

  try {
    const sourceJson = JSON.stringify(resolvedSource);
    const fullCode = `
(async function __watchtower_runner__() {
  "use strict";
  ${BASE_API_JS(sourceJson)}
  ${code.trim()}
  var extention;
  try {
    extention = new DefaultExtension();
  } catch (__e) {
    throw new Error('InstantiationError: ' + (__e && __e.message ? __e.message : String(__e)));
  }
  try {
    var __srcPrefs = extention.getSourcePreferences ? extention.getSourcePreferences() : [];
    for (var __p of (__srcPrefs || [])) {
      var __k = __p.key;
      var __pref = __p.editTextPreference || __p.listPreference || __p.checkBoxPreference || __p.multiSelectListPreference;
      if (__k && __pref && __pref.value !== undefined && !(__k in __sharedPrefsStore)) {
        __sharedPrefsStore[__k] = __pref.value;
      }
    }
  } catch (_) {}
  ${buildCall(method, params)}
})()`;

    log({ type: "info", message: `▶ ${method}(${JSON.stringify(params)}) — ${(resolvedSource.name as string) || "?"}` });

    const raw = await vm.runInContext(fullCode, sandbox, {
      filename: "watchtower-extension.js",
      timeout: 60000,
    }) as string;

    dom.reset();

    let result: unknown;
    try { result = typeof raw === "string" ? JSON.parse(raw) : raw; }
    catch { result = raw; }

    log({ type: "info", message: `✓ Done in ${Date.now() - t0}ms` });
    return { result, logs, error: null, timing: Date.now() - t0 };
  } catch (err) {
    dom.reset();
    const e = err as Error;
    log({ type: "error", message: e.message, stack: e.stack });
    return {
      result: null,
      logs,
      error: { name: e.name || "Error", message: e.message || String(e), stack: e.stack },
      timing: Date.now() - t0,
    };
  }
}
