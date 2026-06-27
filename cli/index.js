#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Watchtower Dev CLI — test JS extensions from the command line
// Usage: node cli/index.js --help
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runJsExtension } from '../server/engine/js-runner.js';

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE   = '\x1b[34m';
const CYAN   = '\x1b[36m';
const GRAY   = '\x1b[90m';

function c(color, str) { return `${color}${str}${RESET}`; }

function printHelp() {
  console.log(`
${c(BOLD, '🗼  Watchtower Dev CLI')} ${c(GRAY, '— Extension Tester')}

${c(BOLD, 'USAGE')}
  node cli/index.js [options]

${c(BOLD, 'OPTIONS')}
  ${c(CYAN, '--file')}    <path>   Path to extension file (.js or .dart)
  ${c(CYAN, '--method')}  <name>   Method to call (default: getPopular)
  ${c(CYAN, '--page')}    <n>      Page number (default: 1)
  ${c(CYAN, '--query')}   <q>      Search query (for search method)
  ${c(CYAN, '--url')}     <url>    Content URL (for getDetail/getPageList/getVideoList)
  ${c(CYAN, '--source')}  <json>   Source metadata JSON string
  ${c(CYAN, '--json')}             Output raw JSON (for piping)
  ${c(CYAN, '--verbose')}          Show all bridge/DOM log events
  ${c(CYAN, '--help')}             Show this help

${c(BOLD, 'METHODS')}
  ${c(GREEN, 'getPopular')}        Browse popular content  (needs: --page)
  ${c(GREEN, 'getLatestUpdates')} Latest updates          (needs: --page)
  ${c(GREEN, 'search')}           Search content          (needs: --query, --page)
  ${c(GREEN, 'getDetail')}        Get item details        (needs: --url)
  ${c(GREEN, 'getPageList')}      Get manga pages         (needs: --url)
  ${c(GREEN, 'getVideoList')}     Get video sources       (needs: --url)
  ${c(GREEN, 'getFilterList')}    Get available filters
  ${c(GREEN, 'supportsLatest')}   Check latest support

${c(BOLD, 'EXAMPLES')}
  ${c(DIM, '# Test getPopular on a JS extension')}
  node cli/index.js --file extensions/mangaplus.js --method getPopular --page 1

  ${c(DIM, '# Search on page 2')}
  node cli/index.js --file myext.js --method search --query "one piece" --page 2

  ${c(DIM, '# Get video list and output JSON')}
  node cli/index.js --file animeext.js --method getVideoList --url "https://…" --json

  ${c(DIM, '# Full test: popular → detail → pages')}
  node cli/index.js --file ext.js --method getPopular --page 1
  node cli/index.js --file ext.js --method getDetail --url <url-from-above>
  node cli/index.js --file ext.js --method getPageList --url <url-from-detail>
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { args.help = true; continue; }
    if (a === '--json') { args.json = true; continue; }
    if (a === '--verbose') { args.verbose = true; continue; }
    if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args[a.replace(/^--/, '')] = argv[++i];
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.file) { printHelp(); process.exit(args.help ? 0 : 1); }

  const filePath = resolve(args.file);
  let code;
  try {
    code = readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(c(RED, `Error reading file: ${err.message}`));
    process.exit(1);
  }

  const ext = filePath.endsWith('.dart') ? 'dart' : 'js';
  if (ext === 'dart') {
    console.error(c(YELLOW, 'Dart extensions require a local Dart SDK. Use the web UI or install Dart SDK.'));
    process.exit(1);
  }

  const method  = args.method || 'getPopular';
  const params  = { page: Number(args.page || 1), query: args.query || '', url: args.url || '' };
  let source = { id: 'cli-dev', name: 'CLI Dev', lang: 'en', baseUrl: '', typeSource: 1 };

  if (args.source) {
    try { source = { ...source, ...JSON.parse(args.source) }; }
    catch { console.error(c(YELLOW, 'Invalid --source JSON, using defaults')); }
  }

  if (!args.json) {
    console.log(`\n${c(BOLD, '🗼 Watchtower Dev CLI')}`);
    console.log(`${c(GRAY, '─'.repeat(50))}`);
    console.log(`${c(CYAN, 'File')}:   ${filePath}`);
    console.log(`${c(CYAN, 'Method')}: ${c(GREEN, method)}`);
    console.log(`${c(CYAN, 'Params')}: ${JSON.stringify(params)}`);
    console.log(`${c(GRAY, '─'.repeat(50))}\n`);
  }

  const { result, error, logs, timing } = await runJsExtension({
    code, source, method, params,
    onLog: (entry) => {
      if (args.json) return;
      const { type, ts } = entry;
      const tsStr = ts !== undefined ? c(GRAY, `+${ts}ms`) : '';

      if (type === 'network') {
        console.log(`  ${c(BLUE, '→')} ${c(BLUE, entry.method)} ${c(GRAY, entry.url)} ${tsStr}`);
      } else if (type === 'network_error') {
        console.log(`  ${c(RED, '✕')} ${c(RED, entry.error || entry.message)} ${tsStr}`);
      } else if (type === 'error') {
        console.log(`  ${c(RED, '✕')} ${c(RED, entry.message)}`);
      } else if (type === 'info') {
        console.log(`  ${c(GRAY, '·')} ${c(GRAY, entry.message)} ${tsStr}`);
      } else if (type === 'console' || type === 'ext_log') {
        console.log(`  ${c(YELLOW, '[ext]')} ${entry.message}`);
      } else if (args.verbose) {
        console.log(`  ${c(GRAY, `[${type}]`)} ${JSON.stringify(entry)}`);
      }
    },
    signal: AbortSignal.timeout(60000),
  });

  if (args.json) {
    console.log(JSON.stringify({ success: !error, result, error, timing, logs }, null, 2));
    process.exit(error ? 1 : 0);
  }

  console.log(`\n${c(GRAY, '─'.repeat(50))}`);

  if (error) {
    console.log(`${c(RED, `✕ ${error.name || 'Error'}`)}: ${error.message}`);
    if (error.stack) {
      console.log(c(GRAY, error.stack.split('\n').slice(1).join('\n')));
    }
    if (error.jsError) {
      console.log(c(GRAY, `JS Error: ${JSON.stringify(error.jsError, null, 2)}`));
    }
    console.log();
    process.exit(1);
  }

  console.log(`${c(GREEN, `✓ Success`)} ${c(GRAY, `(${timing}ms)`)}\n`);
  printResult(result, method, args.verbose);
  process.exit(0);
}

function printResult(result, method, verbose) {
  if (!result) { console.log(c(GRAY, '(empty result)')); return; }

  // Detect arrays / list shapes
  const items = Array.isArray(result) ? result :
    (result.list || result.results || result.manga || result.anime || result.data || null);

  if (method === 'getPopular' || method === 'getLatestUpdates' || method === 'search') {
    if (items?.length > 0) {
      console.log(c(BOLD, `Found ${items.length} items:\n`));
      items.slice(0, 20).forEach((item, i) => {
        console.log(`  ${c(GRAY, `${i + 1}.`)} ${c(BOLD, item.title || item.name || '?')} ${c(GRAY, item.link || item.url || '')}`);
        if (item.imageUrl) console.log(`     ${c(GRAY, `img: ${item.imageUrl}`)}`);
      });
      if (items.length > 20) console.log(c(GRAY, `  … and ${items.length - 20} more`));
    }
  } else if (method === 'getDetail') {
    console.log(c(BOLD, result.title || result.name || '?'));
    if (result.author)      console.log(`Author: ${result.author}`);
    if (result.description) console.log(`Desc:   ${result.description.slice(0, 200)}…`);
    const chaps = result.chapters || result.episodes || [];
    if (chaps.length) console.log(`${chaps.length > 0 ? c(GREEN, chaps.length) : chaps.length} chapters/episodes`);
  } else if (method === 'getPageList') {
    const pages = Array.isArray(result) ? result : (result.pageList || result.pages || []);
    console.log(c(GREEN, `${pages.length} pages`));
    pages.slice(0, 5).forEach((p, i) => console.log(`  ${c(GRAY, `${i + 1}.`)} ${typeof p === 'string' ? p : p.url || JSON.stringify(p)}`));
    if (pages.length > 5) console.log(c(GRAY, `  … and ${pages.length - 5} more`));
  } else if (method === 'getVideoList') {
    const vids = Array.isArray(result) ? result : (result.videoList || result.videos || []);
    console.log(c(GREEN, `${vids.length} video source(s)`));
    vids.forEach((v, i) => {
      const url = typeof v === 'string' ? v : (v.url || v.videoUrl || '?');
      const q   = v.quality || v.resolution || '';
      console.log(`  ${c(GRAY, `${i + 1}.`)} ${c(CYAN, q || 'Unknown')} ${c(GRAY, url)}`);
    });
  } else {
    if (verbose) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const str = JSON.stringify(result, null, 2);
      const lines = str.split('\n');
      console.log(lines.slice(0, 30).join('\n'));
      if (lines.length > 30) console.log(c(GRAY, `… (${lines.length - 30} more lines — use --json for full output)`));
    }
  }
  console.log();
}

main().catch(err => {
  console.error(c(RED, `Fatal: ${err.message}`));
  console.error(err.stack);
  process.exit(1);
});
