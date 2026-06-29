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
      // Filter out empty/null header values before merging — extensions may set
      // user-agent: "" from SharedPreferences defaults, which breaks some APIs.
      const cleanHeaders = Object.fromEntries(
        Object.entries(headers || {}).filter(([, v]) => v !== null && v !== undefined && v !== '')
      );

      const config = {
        method,
        url,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', ...cleanHeaders },
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
