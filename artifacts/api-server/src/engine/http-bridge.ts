import axios from "axios";

interface LogEntry {
  type: string;
  method?: string;
  url?: string;
  status?: number;
  error?: string;
}

export class HttpBridge {
  private _logger: (entry: LogEntry) => void;

  constructor(logger?: (entry: LogEntry) => void) {
    this._logger = logger || (() => {});
  }

  async handle(channel: string, argsJson: string, abortSignal?: AbortSignal): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args: any[] = JSON.parse(argsJson);
    const url: string = args[2];
    const headers: Record<string, string> = args[3] || {};
    const body = args[4];
    const method = channel.replace("http_", "").toUpperCase();

    this._logger({ type: "network", method, url });

    try {
      const cleanHeaders = Object.fromEntries(
        Object.entries(headers || {}).filter(([, v]) => v !== null && v !== undefined && v !== ""),
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: any = {
        method,
        url,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          ...cleanHeaders,
        },
        responseType: "text",
        transformResponse: [(d: string) => d],
        maxRedirects: 5,
        validateStatus: () => true,
        timeout: 30000,
        signal: abortSignal,
      };

      if (body !== undefined && !["GET", "HEAD"].includes(method)) {
        config.data = typeof body === "string" ? body : JSON.stringify(body);
      }

      const resp = await axios(config);
      this._logger({ type: "network", method, url, status: resp.status });

      return JSON.stringify({
        body: resp.data || "",
        statusCode: resp.status,
        headers: Object.fromEntries(Object.entries(resp.headers).map(([k, v]) => [k, String(v)])),
        isRedirect: false,
        persistentConnection: false,
        reasonPhrase: resp.statusText || "OK",
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
      const e = err as { message?: string; response?: { status?: number } };
      this._logger({ type: "network_error", method, url, error: e.message });
      return JSON.stringify({
        body: "",
        statusCode: 0,
        headers: {},
        isRedirect: false,
        persistentConnection: false,
        reasonPhrase: `Error: ${e.message}`,
        request: { contentLength: null, finalized: false, followRedirects: true, headers, maxRedirects: 5, method, persistentConnection: false, url },
      });
    }
  }
}
