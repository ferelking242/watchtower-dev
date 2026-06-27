// ─────────────────────────────────────────────────────────────────────────────
// HTTP bridge — Node.js implementation of Dart's JsHttpClient handlers.
// Returns the exact same JSON response shape the JS extensions expect.
// ─────────────────────────────────────────────────────────────────────────────
import axios from 'axios';

export class HttpBridge {
  constructor(logger) {
    this._logger = logger || (() => {});
  }

  /** Handle an HTTP channel + JSON args → returns JSON string (same as Dart) */
  async handle(channel, argsJson, abortSignal) {
    const args = JSON.parse(argsJson);
    // args: [null, reqcopyWith, url, headers, body?]
    const url     = args[2];
    const headers = args[3] || {};
    const body    = args[4];
    const method  = channel.replace('http_', '').toUpperCase();

    this._logger({ type: 'network', method, url });

    try {
      const config = {
        method,
        url,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WatchtowerDev/1.0)', ...headers },
        responseType: 'text',
        transformResponse: [d => d],
        maxRedirects: 5,
        validateStatus: () => true,
        timeout: 30000,
        signal: abortSignal,
      };

      if (body !== undefined && !['GET', 'HEAD'].includes(method)) {
        config.data = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const resp = await axios(config);

      this._logger({ type: 'network', method, url, status: resp.status });

      return JSON.stringify({
        body: resp.data || '',
        statusCode: resp.status,
        headers: Object.fromEntries(
          Object.entries(resp.headers).map(([k, v]) => [k, String(v)])
        ),
        isRedirect: resp.request?.res?.responseUrl !== url,
        persistentConnection: false,
        reasonPhrase: resp.statusText || 'OK',
        request: {
          contentLength: null,
          finalized: true,
          followRedirects: true,
          headers,
          maxRedirects: 5,
          method,
          persistentConnection: false,
          url,
        },
      });
    } catch (err) {
      this._logger({ type: 'network_error', method, url, error: err.message });

      return JSON.stringify({
        body: '',
        statusCode: 0,
        headers: {},
        isRedirect: false,
        persistentConnection: false,
        reasonPhrase: `Error: ${err.message}`,
        request: { contentLength: null, finalized: false, followRedirects: true, headers, maxRedirects: 5, method, persistentConnection: false, url },
      });
    }
  }
}
