// ─────────────────────────────────────────────────────────────────────────────
// JS Extension Runner — Node.js vm sandbox engine.
// Replicates Mangayomi's flutter_qjs behaviour:
//   - DOM calls are SYNCHRONOUS (domMessage)
//   - HTTP calls are ASYNC (sendMessage → await)
//   - SharedPreferences returns defaults
// Engine: V8 (Node.js vm) — compatible with 99%+ of extensions.
// ─────────────────────────────────────────────────────────────────────────────
import vm from 'vm';
import { BASE_API_JS } from './base-api.js';
import { DomBridge } from './dom-bridge.js';
import { HttpBridge } from './http-bridge.js';

/**
 * Extract `mangayomiSources` from extension code in an isolated VM scope.
 * Returns the merged source entry (extension defaults + user overrides).
 */
function extractSource(code, userSource) {
  try {
    const preamble = code.split(/\bclass\s+DefaultExtension\b/)[0] || '';
    const sandbox = { JSON };
    vm.createContext(sandbox);
    const snippet = `(function(){
      ${preamble}
      return typeof mangayomiSources !== 'undefined' ? JSON.stringify(mangayomiSources) : '[]';
    })()`;
    const raw = vm.runInContext(snippet, sandbox, { timeout: 2000 });
    const sources = JSON.parse(raw);
    if (!Array.isArray(sources) || sources.length === 0) return userSource || {};

    const lang = userSource?.lang || 'en';
    const entry = sources.find(s => s.lang === lang)
      || sources.find(s => Array.isArray(s.langs) && s.langs.includes(lang))
      || sources[0];

    return {
      ...entry,
      ...(userSource?.id                                   ? { id: userSource.id }         : {}),
      ...(userSource?.lang                                 ? { lang: userSource.lang }     : {}),
      ...(userSource?.name                                 ? { name: userSource.name }     : {}),
      ...(userSource?.baseUrl && userSource.baseUrl !== '' ? { baseUrl: userSource.baseUrl } : {}),
    };
  } catch {
    return userSource || {};
  }
}

/**
 * Run a JS extension method.
 */
export async function runJsExtension({ code, source, method, params = {}, onLog, signal }) {
  const logs = [];
  const t0 = Date.now();

  function log(entry) {
    const e = { ts: Date.now() - t0, ...entry };
    logs.push(e);
    onLog?.(e);
  }

  const resolvedSource = extractSource(code, source);
  const dom  = new DomBridge();
  const http = new HttpBridge((e) => log(e));

  // ── sendMessage — ASYNC, for HTTP channels ────────────────────────────────
  async function sendMessage(channel, argsJson) {
    log({ type: 'bridge', channel });
    try {
      if (channel.startsWith('http_')) {
        return await http.handle(channel, argsJson, signal);
      }
      if (channel === 'ext_log') {
        const msg = JSON.parse(argsJson)[0];
        log({ type: 'ext_log', message: String(msg) });
        return '';
      }
      // Fallback: try DOM bridge (should use domMessage instead)
      return dom.handle(channel, argsJson);
    } catch (err) {
      log({ type: 'bridge_error', channel, error: err.message });
      return '';
    }
  }

  // ── domMessage — SYNCHRONOUS, for DOM channels ────────────────────────────
  function domMessage(channel, argsJson) {
    try {
      return dom.handle(channel, argsJson);
    } catch (err) {
      log({ type: 'bridge_error', channel, error: err.message });
      return '';
    }
  }

  // ── Shared preferences store — populated from getSourcePreferences() defaults ─
  const sharedPrefsStore = {};

  // ── Sandbox ───────────────────────────────────────────────────────────────
  const consoleProxy = {
    log:   (...a) => log({ type: 'console', message: a.map(safeStr).join(' ') }),
    warn:  (...a) => log({ type: 'console', message: '[warn] '  + a.map(safeStr).join(' ') }),
    error: (...a) => log({ type: 'console', message: '[error] ' + a.map(safeStr).join(' ') }),
    info:  (...a) => log({ type: 'console', message: '[info] '  + a.map(safeStr).join(' ') }),
  };

  const sandbox = {
    sendMessage,   // async — HTTP
    domMessage,    // sync  — DOM
    __sharedPrefsStore: sharedPrefsStore,
    console: consoleProxy,
    JSON, Promise, Error, TypeError, RangeError, SyntaxError, URIError, EvalError,
    Object, Array, String, Number, Boolean, Symbol, BigInt,
    RegExp, Map, Set, WeakMap, WeakSet, Date,
    Math, parseInt, parseFloat, isNaN, isFinite,
    encodeURIComponent, decodeURIComponent, encodeURI, decodeURI,
    setTimeout: (fn, ms) => new Promise(r => setTimeout(() => { fn(); r(); }, ms || 0)),
    clearTimeout: () => {},
    atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
    btoa: (s) => Buffer.from(s, 'utf8').toString('base64'),
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

  // ── Base API ────────────────────────────────────────────────────────────
  ${BASE_API_JS(sourceJson)}

  // ── Extension code ──────────────────────────────────────────────────────
  ${code.trim()}

  // ── Instantiate ─────────────────────────────────────────────────────────
  var extention;
  try {
    extention = new DefaultExtension();
  } catch (__e) {
    throw new Error('InstantiationError: ' + (__e && __e.message ? __e.message : String(__e)));
  }

  // ── Pre-populate SharedPreferences from getSourcePreferences() defaults ──
  // Mirrors Mangayomi: preferences start at their defined default values.
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

  // ── Call method ─────────────────────────────────────────────────────────
  ${buildCall(method, params)}
})()`;

    log({ type: 'info', message: `▶ ${method}(${JSON.stringify(params)}) — ${resolvedSource.name || '?'} (${resolvedSource.baseUrl || ''})` });

    const raw = await vm.runInContext(fullCode, sandbox, {
      filename: 'watchtower-extension.js',
      timeout: 60000,
    });

    dom.reset();

    let result;
    try { result = typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch { result = raw; }

    log({ type: 'info', message: `✓ Done in ${Date.now() - t0}ms` });
    return { result, logs, error: null, timing: Date.now() - t0 };

  } catch (err) {
    dom.reset();
    log({ type: 'error', message: err.message, stack: err.stack });
    return {
      result: null,
      logs,
      error: { name: err.name || 'Error', message: err.message || String(err), stack: err.stack },
      timing: Date.now() - t0,
    };
  }
}

function safeStr(v) {
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

function buildCall(method, params) {
  switch (method) {
    case 'getPopular':
      return `return JSON.stringify(await extention.getPopular(${Number(params.page) || 1}));`;
    case 'getLatestUpdates':
      return `return JSON.stringify(await extention.getLatestUpdates(${Number(params.page) || 1}));`;
    case 'search':
      return `return JSON.stringify(await extention.search(${JSON.stringify(params.query || '')}, ${Number(params.page) || 1}, []));`;
    case 'getDetail':
      return `return JSON.stringify(await extention.getDetail(${JSON.stringify(params.url || '')}));`;
    case 'getPageList':
      return `return JSON.stringify(await extention.getPageList(${JSON.stringify(params.url || '')}));`;
    case 'getVideoList':
      return `return JSON.stringify(await extention.getVideoList(${JSON.stringify(params.url || '')}));`;
    case 'getHtmlContent':
      return `return JSON.stringify(await extention.getHtmlContent(${JSON.stringify(params.name || '')}, ${JSON.stringify(params.url || '')}));`;
    case 'getFilterList':
      return `return JSON.stringify(extention.getFilterList());`;
    case 'getSourcePreferences':
      return `return JSON.stringify(extention.getSourcePreferences());`;
    case 'supportsLatest':
      return `return JSON.stringify(extention.supportsLatest);`;
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}
