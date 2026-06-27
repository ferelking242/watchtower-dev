# 🗼 Watchtower Dev

**Extension testing tool for [Watchtower](https://github.com/kodjodevf/mangayomi) developers.**

Test your JS and Dart extensions against the exact same engine used in the Watchtower app — same QuickJS runtime, same HTTP bridge, same DOM parser, same error messages. What you see here is what you get in the app.

---

## Features

- **Identical JS engine** — QuickJS (same engine as `flutter_qjs`)
- **Full HTTP bridge** — real network requests, same response format as the app
- **DOM bridge** — cheerio-based, matching the Dart `html` package behavior
- **Extension browser** — browse and load extensions from `watchtower-extensions` on GitHub
- **Full flow testing** — getPopular → search → getDetail → getPageList / getVideoList
- **Manga reader** — view actual pages returned by `getPageList`
- **Video player** — HLS + MP4 playback for `getVideoList` results
- **Real-time console** — every HTTP request, DOM call, and JS log visible in real time
- **CLI tool** — for automated testing and CI pipelines

---

## Architecture

```
watchtower_dev/
├── server/                  Node.js Express server (port 5000)
│   ├── engine/
│   │   ├── js-runner.js     QuickJS (asyncify) engine — identical to flutter_qjs
│   │   ├── base-api.js      MProvider + Client + Document + Element (injected JS)
│   │   ├── dom-bridge.js    DOM channel handlers (cheerio)
│   │   └── http-bridge.js   HTTP channel handlers (axios)
│   ├── routes/
│   │   ├── run.js           POST /api/run — stream test results via SSE
│   │   └── extensions.js    GET /api/extensions/* — GitHub repo browser
│   └── index.js             Server entry point
├── client/                  React + Vite + Tailwind frontend
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── Sidebar.jsx       Extension browser + local file loader
│           ├── TestRunner.jsx    Method selector + parameter inputs
│           ├── ResultGrid.jsx    Grid of manga/anime cards (covers, titles)
│           ├── DevConsole.jsx    Real-time log viewer
│           ├── MangaReader.jsx   Page-by-page manga reader
│           └── VideoPlayer.jsx   HLS/MP4 video player
└── cli/
    └── index.js             CLI tool for automated testing
```

---

## How the JS Engine Works

The JS engine is a faithful Node.js replica of `JsExtensionService` in the Watchtower app:

1. **QuickJS runtime** — `quickjs-emscripten` (asyncify variant) — same QuickJS as `flutter_qjs`
2. **`sendMessage` bridge** — async function dispatched to Node.js handlers per channel:
   - `http_get / http_post / …` → `axios` (real HTTP, same response JSON shape)
   - `get_doc_element / doc_select / ele_attr / …` → `cheerio` (same as Dart `html` package)
3. **Base API injected** — `MProvider`, `Client`, `Document`, `Element`, filter classes
4. **Extension code evaluated** — `DefaultExtension extends MProvider`
5. **Method called** — `extention.getPopular(page)`, `extention.search(query, page, filters)`, etc.

Extensions see the exact same API surface as in the app. Errors are identical.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install & Run

```bash
cd watchtower_dev
npm run install:all
npm start
```

Open `http://localhost:5000` in your browser.

### CLI

```bash
# Test getPopular
node cli/index.js --file path/to/extension.js --method getPopular --page 1

# Search
node cli/index.js --file ext.js --method search --query "naruto" --page 1

# Get video list
node cli/index.js --file anime.js --method getVideoList --url "https://…"

# JSON output (for CI/piping)
node cli/index.js --file ext.js --method getPopular --json

# Verbose mode (shows all bridge calls)
node cli/index.js --file ext.js --method getPopular --verbose
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | GitHub PAT for accessing `watchtower-extensions` (avoids rate limits) |
| `PORT` | Server port (default: 5000) |

---

## Testing Your Extension

1. Open the app at `http://localhost:5000`
2. In the sidebar, either:
   - **Browse** → pick an extension from `watchtower-extensions`
   - **Local** → upload your `.js` file or paste code
3. Set the **Source** metadata (name, lang, baseUrl) to match your extension
4. Pick a method (`getPopular`, `search`, etc.) and hit **Run**
5. Watch the console for HTTP requests and any errors
6. Results appear as a grid — click through to detail, pages, or video

---

## Extension API Reference

Your extension must define `class DefaultExtension extends MProvider`:

```js
class DefaultExtension extends MProvider {
  // Required for manga/webtoon sources:
  async getPopular(page) { /* → { list: [{ title, imageUrl, link }], hasNextPage } */ }
  async getLatestUpdates(page) { /* → same shape as getPopular */ }
  async search(query, page, filters) { /* → same shape */ }
  async getDetail(url) { /* → { title, imageUrl, description, author, chapters: [...] } */ }
  async getPageList(url) { /* → [imageUrl, ...] */ }

  // Required for anime sources:
  async getVideoList(url) { /* → [{ url, quality, headers }] */ }

  // Optional:
  getFilterList() { /* → [SelectFilter, CheckBoxFilter, ...] */ }
  getSourcePreferences() { /* → [ListPreference, ...] */ }
  get supportsLatest() { return true; }
}
```

Available classes: `Client`, `Document`, `Element`, `SelectFilter`, `CheckBoxFilter`, `TriStateFilter`, `TextFilter`, `SortFilter`, `GroupFilter`, `ListPreference`, `EditTextPreference`, `CheckBoxPreference`, `MultiSelectListPreference`.

---

## License

Apache 2.0 — same as Watchtower.
