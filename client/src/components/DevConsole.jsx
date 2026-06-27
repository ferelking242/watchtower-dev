import React, { useEffect, useRef } from 'react';
import { Terminal, Wifi, WifiOff, Info, AlertTriangle, Code2 } from 'lucide-react';

const LEVEL_CONFIG = {
  network:       { color: 'text-blue-400',   Icon: Wifi,          label: 'NET' },
  network_error: { color: 'text-red-400',    Icon: WifiOff,       label: 'NET' },
  bridge:        { color: 'text-purple-400', Icon: Code2,         label: 'BRG' },
  bridge_error:  { color: 'text-red-400',    Icon: Code2,         label: 'BRG' },
  info:          { color: 'text-gray-400',   Icon: Info,          label: 'INF' },
  error:         { color: 'text-red-400',    Icon: AlertTriangle, label: 'ERR' },
  console:       { color: 'text-green-400',  Icon: Terminal,      label: 'LOG' },
  ext_log:       { color: 'text-yellow-400', Icon: Terminal,      label: 'EXT' },
};

function LogEntry({ entry, idx }) {
  const cfg = LEVEL_CONFIG[entry.type] || LEVEL_CONFIG.info;
  const { Icon, color, label } = cfg;

  return (
    <div className="log-entry flex items-start gap-2 px-3 py-1 hover:bg-surface-2 group text-xs font-mono">
      <span className="text-[10px] text-gray-700 shrink-0 w-8 pt-0.5 text-right">{idx + 1}</span>
      <span className={`shrink-0 pt-0.5 ${color}`}><Icon size={11} /></span>
      <span className={`tag text-[9px] shrink-0 mt-0.5 ${color} bg-current/10`}>{label}</span>
      {entry.ts !== undefined && (
        <span className="text-gray-700 shrink-0 w-12 pt-0.5 text-right">+{entry.ts}ms</span>
      )}
      <div className="flex-1 min-w-0 text-gray-300 leading-relaxed">
        {entry.type === 'network' && (
          <span>
            <span className="text-blue-400">{entry.method}</span>
            {' '}
            <span className="text-gray-400 break-all">{entry.url}</span>
          </span>
        )}
        {(entry.type === 'network_error' || entry.type === 'bridge_error') && (
          <span className="text-red-400">{entry.error || entry.message}</span>
        )}
        {(entry.type === 'bridge') && (
          <span className="text-purple-300">{entry.channel}</span>
        )}
        {(entry.type === 'info' || entry.type === 'error') && (
          <span className={entry.type === 'error' ? 'text-red-300' : ''}>{entry.message}</span>
        )}
        {(entry.type === 'console' || entry.type === 'ext_log') && (
          <span className="text-green-300">{entry.message}</span>
        )}
        {/* Network status badge */}
        {entry.status !== undefined && (
          <span className={`ml-2 text-[10px] px-1 rounded ${entry.status >= 400 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
            {entry.status}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DevConsole({ logs, error, running }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      {/* Header */}
      <div className="sticky top-0 flex items-center gap-2 px-3 py-2 bg-surface-1 border-b border-white/5 text-xs text-gray-500 z-10">
        <Terminal size={12} />
        <span>Console</span>
        <span className="ml-auto">{logs.length} events</span>
        {running && <span className="w-1.5 h-1.5 bg-accent-blue rounded-full pulse-dot" />}
      </div>

      {logs.length === 0 && !error && (
        <div className="flex items-center justify-center h-32 text-gray-700 text-xs">
          Console output will appear here
        </div>
      )}

      <div className="py-1">
        {logs.map((entry, i) => <LogEntry key={i} entry={entry} idx={i} />)}

        {error && (
          <div className="mx-3 my-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-xs mb-1">
              <AlertTriangle size={12} />
              {error.name || 'Error'}
            </div>
            <p className="text-xs text-red-300 font-mono">{error.message}</p>
            {error.stack && (
              <pre className="mt-2 text-[11px] text-red-400/60 font-mono whitespace-pre-wrap">{error.stack}</pre>
            )}
          </div>
        )}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
