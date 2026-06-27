// ─────────────────────────────────────────────────────────────────────────────
// JS Extension Runner — Node.js vm sandbox engine.
// Replicates flutter_qjs behavior: same MProvider API, same HTTP bridge,
// same DOM bridge, same error propagation.
// Engine: V8 (Node.js vm) — identical to QuickJS for 99% of extensions.
// ─────────────────────────────────────────────────────────────────────────────
import vm from 'vm';
import { BASE_API_JS } from './base-api.js';
import { DomBridge } from './dom-bridge.js';
import { HttpBridge } from './http-bridge.js';

/** Normalize extension code (mirrors Watchtower's normalizeExtensionCode) */
function normalizeJs(code) {
  return code.trim();
}

/**
 * Run a JS extension method.
 * @param {object} opts
 * @param {string} opts.code    - Extension JS source
 * @param {object} opts.source  - Source metadata
 * @param {string} opts.method  - Method name
 * @param {object} opts.params  - { page, query, url, filters }
 * @param {function} opts.onLog - Log callback
 * @param {AbortSignal} opts.signal
 */
export async function runJsExtension({ code, source, method, params = {}, onLog, signal }) {
  const logs = [];
  const t0 = Date.now();

  function log(entry) {
    const e = { ts: Date.now() - t0, ...entry };
    logs.push(e);
    onLog?.(e);
  }

  const dom  = new DomBridge();
  const http = new HttpBridge((e) => log(e));

  // ── sendMessage bridge ────────────────────────────────────────────────────
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
      // DOM channels — synchronous
      const result = dom.handle(channel, argsJson);
      return result;
    } catch (err) {
      log({ type: 'bridge_error', channel, error: err.message });
      return '';
    }
  }

  // ── Build sandbox context ─────────────────────────────────────────────────
  const consoleProxy = {
    log:   (...a) => log({ type: 'console', message: a.map(safeStr).join(' ') }),
    warn:  (...a) => log({ type: 'console', message: '[warn] ' + a.map(safeStr).join(' ') }),
    error: (...a) => log({ type: 'console', message: '[error] ' + a.map(safeStr).join(' ') }),
    info:  (...a) => log({ type: 'console', message: '[info] ' + a.map(safeStr).join(' ') }),
  };

  const sandbox = {
    sendMessage,
    console: consoleProxy,
    // Standard globals
    JSON, Promise, Error, TypeError, RangeError, SyntaxError,
    Object, Array, String, Number, Boolean, Symbol, BigInt,
    RegExp, Map, Set, WeakMap, WeakSet, Date,
    Math, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    encodeURI, decodeURI, setTimeout: (fn, ms) => new Promise(r => setTimeout(() => { fn(); r(); }, ms || 0)),
    clearTimeout: () => {},
    // atob / btoa for base64
    atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
    btoa: (s) => Buffer.from(s, 'utf8').toString('base64'),
    // TextDecoder / TextEncoder
    TextDecoder, TextEncoder,
    // Abort support
    AbortSignal, AbortController,
  };

  vm.createContext(sandbox);

  try {
    const sourceJson = JSON.stringify(source || {});
    const fullCode = `
(async function __watchtower_runner__() {
  "use strict";

  // ── Base API injection ──────────────────────────────────────────────────
  ${BASE_API_JS(sourceJson)}

  // ── Extension code ──────────────────────────────────────────────────────
  ${normalizeJs(code)}

  // ── Instantiate ─────────────────────────────────────────────────────────
  var extention;
  try {
    extention = new DefaultExtension();
  } catch (__e) {
    throw new Error('InstantiationError: ' + (__e && __e.message ? __e.message : String(__e)));
  }

  // ── Call method ─────────────────────────────────────────────────────────
  ${buildCall(method, params)}
})()`;

    log({ type: 'info', message: `Calling ${method}(${JSON.stringify(params)}) on extension (${code.length} chars)` });

    const resultPromise = vm.runInContext(fullCode, sandbox, {
      filename: 'watchtower-extension.js',
      timeout: 60000,
    });

    const raw = await resultPromise;
    dom.reset();

    let result;
    try { result = typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch { result = raw; }

    log({ type: 'info', message: `Done in ${Date.now() - t0}ms` });
    return { result, logs, error: null, timing: Date.now() - t0 };
  } catch (err) {
    dom.reset();
    log({ type: 'error', message: err.message, stack: err.stack });

    // Classify error type (mirrors Watchtower's error handling)
    const name = err.name || 'Error';
    const message = err.message || String(err);

    return {
      result: null,
      logs,
      error: { name, message, stack: err.stack },
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
