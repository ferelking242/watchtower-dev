# Watchtower Dev

> Web-based extension testing tool for [Watchtower](https://github.com/kodjodevf/mangayomi) (Mangayomi fork) JS & Dart extensions.

![Watchtower Dev](https://img.shields.io/badge/Watchtower-Dev-blue?style=flat-square)
![Extensions](https://img.shields.io/badge/Extensions-700%2B-green?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)

## Features

- 🗼 **Browse 700+ extensions** from [ferelking242/watchtower-extensions](https://github.com/ferelking242/watchtower-extensions) — manga, watch, novel, game, music
- 🔍 **Filter** by category, language, and type (JS / Dart)
- ▶️ **Run extension methods** — `getPopular`, `search`, `getDetail`, `getPageList`, `getVideoList`, and more
- 📺 **Live results** — media grid, detail view, manga reader, video player
- 🖥️ **Dev console** — real-time SSE logs (network, bridge, runtime errors)
- 🎨 **Multiple themes** — dark / light + 5 accent colours (blue, violet, red, emerald, orange)
- 🌐 **i18n** — English & French UI
- 📁 **Local extensions** — upload a `.js` or `.dart` file, or paste code directly

## Stack

- **Server**: Node.js + Express (ES modules), SSE streaming
- **Client**: React 18 + Vite, shadcn/ui design system, Tailwind CSS v3
- **i18n**: react-i18next
- **Extension engine**: Dart VM bridge + QuickJS (JS extensions)

## Getting Started

```bash
# Clone
git clone https://github.com/ferelking242/watchtower-dev.git
cd watchtower-dev

# Install
cd server && npm install
cd ../client && npm install

# Set env
export GITHUB_TOKEN=your_pat_with_repo_scope

# Run server (port 3000)
cd server && npm start

# Build client
cd client && npm run build
# Client is served statically by the server at /
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Optional | GitHub PAT — needed for private extension repos. Falls back to unauthenticated (rate-limited). |

## Extension Categories

| Category | Count |
|---|---|
| Manga | 273 |
| Watch | 179 |
| Novel | 245 |
| Game | 1 |
| Music | 5 |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/wt/extensions/list` | List extensions (`?category=manga&lang=en&type=js`) |
| GET | `/wt/extensions/stats` | Count per category |
| GET | `/wt/extensions/langs` | Available languages |
| GET | `/wt/extensions/code` | Fetch source code (`?url=...`) |
| POST | `/wt/run` | Run an extension method (SSE stream) |
| GET | `/wt/proxy` | Image/resource proxy (`?url=...`) |
| GET | `/wt/health` | Health check |

## License

MIT
