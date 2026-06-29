import React, { useEffect, useRef } from 'react';
import { Terminal, Wifi, WifiOff, Info, AlertTriangle, Code2 } from 'lucide-react';
import { cn } from '../lib/utils.js';

const LEVEL = {
  network:       { color: 'text-blue-400',    Icon: Wifi,          label: 'NET' },
  network_error: { color: 'text-destructive', Icon: WifiOff,       label: 'NET' },
  bridge:        { color: 'text-violet-400',  Icon: Code2,         label: 'BRG' },
  bridge_error:  { color: 'text-destructive', Icon: Code2,         label: 'BRG' },
  info:          { color: 'text-muted-foreground', Icon: Info,     label: 'INF' },
  error:         { color: 'text-destructive', Icon: AlertTriangle, label: 'ERR' },
  console:       { color: 'text-emerald-400', Icon: Terminal,      label: 'LOG' },
  ext_log:       { color: 'text-yellow-400',  Icon: Terminal,      label: 'EXT' },
};

function LogEntry({ entry, idx }) {
  const cfg = LEVEL[entry.type] || LEVEL.info;
  const { Icon, color, label } = cfg;
  return (
    <div className="flex items-start gap-2 px-3 py-1 hover:bg-secondary/30 text-xs font-mono">
      <span className="text-[10px] text-muted-foreground/40 shrink-0 w-7 pt-0.5 text-right">{idx + 1}</span>
      <span className={cn('shrink-0 pt-0.5', color)}><Icon size={11} /></span>
      <span className={cn('text-[9px] shrink-0 mt-0.5 px-1 py-0.5 rounded font-bold bg-current/10', color)}>{label}</span>
      {entry.ts !== undefined && (
        <span className="text-muted-foreground/40 shrink-0 w-12 pt-0.5 text-right">+{entry.ts}ms</span>
      )}
      <div className="flex-1 min-w-0 text-foreground/70 leading-relaxed">
        {entry.type === 'network' && (
          <span>
            <span className="text-blue-400 mr-1">{entry.method}</span>
            <span className="text-muted-foreground break-all">{entry.url}</span>
          </span>
        )}
        {(entry.type === 'network_error' || entry.type === 'bridge_error') && (
          <span className="text-destructive">{entry.error || entry.message}</span>
        )}
        {entry.type === 'bridge' && <span className="text-violet-400">{entry.channel}</span>}
        {(entry.type === 'info' || entry.type === 'error') && (
          <span className={entry.type === 'error' ? 'text-destructive' : ''}>{entry.message}</span>
        )}
        {(entry.type === 'console' || entry.type === 'ext_log') && (
          <span className="text-emerald-400">{entry.message}</span>
        )}
        {entry.status !== undefined && (
          <span className={cn('ml-2 text-[10px] px-1 rounded',
            entry.status >= 400 ? 'bg-destructive/20 text-destructive' : 'bg-emerald-500/20 text-emerald-400'
          )}>
            {entry.status}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DevConsole({ logs, running }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs.length]);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="sticky top-0 flex items-center gap-2 px-3 py-2 bg-card border-b border-border text-xs text-muted-foreground z-10">
        <Terminal size={12} />
        <span>Console</span>
        <span className="ml-auto">{logs.length} events</span>
        {running && <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />}
      </div>
      {logs.length === 0 && (
        <div className="flex items-center justify-center h-24 text-muted-foreground text-xs">
          Console output will appear here
        </div>
      )}
      <div className="py-1">
        {logs.map((entry, i) => <LogEntry key={i} entry={entry} idx={i} />)}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
