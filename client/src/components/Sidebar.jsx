import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, Upload, Globe, FileCode, RefreshCw, Loader,
  BookOpen, Tv, FileText, Gamepad2, Music4,
  ShieldAlert, Cloud, Lock, Layers
} from 'lucide-react';
import { cn } from '../lib/utils.js';

const CATEGORIES = [
  { id: 'all',   label: 'All',     icon: Layers  },
  { id: 'manga', label: 'Manga',   icon: BookOpen },
  { id: 'watch', label: 'Watch',   icon: Tv       },
  { id: 'novel', label: 'Novel',   icon: FileText },
  { id: 'game',  label: 'Game',    icon: Gamepad2 },
  { id: 'music', label: 'Music',   icon: Music4   },
];

const LANG_FLAGS = {
  en:'🇬🇧', fr:'🇫🇷', de:'🇩🇪', es:'🇪🇸', pt:'🇧🇷', it:'🇮🇹',
  ar:'🇸🇦', zh:'🇨🇳', ja:'🇯🇵', ko:'🇰🇷', ru:'🇷🇺', tr:'🇹🇷',
  multi:'🌐', all:'🌐',
};

function ExtIcon({ iconUrl, name, type }) {
  const [ok, setOk] = useState(true);
  const initials = (name || '??').slice(0, 2).toUpperCase();
  return ok && iconUrl ? (
    <img src={iconUrl} alt={name} className="w-8 h-8 rounded-lg object-cover shrink-0"
      onError={() => setOk(false)} />
  ) : (
    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0',
      type === 'js' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-400'
    )}>
      {initials}
    </div>
  );
}

function ExtBadge({ children, variant = 'default' }) {
  return (
    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0',
      variant === 'js'   && 'bg-yellow-500/15 text-yellow-400',
      variant === 'dart' && 'bg-blue-500/15 text-blue-400',
      variant === 'cf'   && 'bg-orange-500/15 text-orange-400',
      variant === 'nsfw' && 'bg-red-500/15 text-red-400',
      variant === 'default' && 'bg-muted text-muted-foreground',
    )}>
      {children}
    </span>
  );
}

function ExtItem({ ext, active, loading, onClick }) {
  const flag = LANG_FLAGS[ext.lang] || '🌐';
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all group relative border-r-2',
        active
          ? 'bg-primary/8 border-primary'
          : 'hover:bg-secondary border-transparent'
      )}
    >
      {loading
        ? <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Loader size={12} className="animate-spin text-primary" />
          </div>
        : <ExtIcon iconUrl={ext.iconUrl} name={ext.name} type={ext.type} />
      }
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate leading-tight',
          active ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
        )}>
          {ext.name}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <span>{flag}</span>
          <span>{ext.lang?.toUpperCase()}</span>
          {ext.hasCloudflare && <Cloud size={9} className="text-orange-400" />}
          {ext.requiresAccount && <Lock size={9} className="text-yellow-400" />}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <ExtBadge variant={ext.type}>{ext.type?.toUpperCase()}</ExtBadge>
        {ext.isNsfw && <ExtBadge variant="nsfw">18+</ExtBadge>}
      </div>
    </button>
  );
}

export default function Sidebar({ onExtensionLoad, extension }) {
  const { t } = useTranslation();
  const [tab, setTab]         = useState('browse');
  const [category, setCategory] = useState('all');
  const [langs, setLangs]     = useState([]);
  const [selLang, setSelLang] = useState('all');
  const [selType, setSelType] = useState('all');
  const [query, setQuery]     = useState('');
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [stats, setStats]     = useState({});
  const [customCode, setCustomCode] = useState('');
  const [customType, setCustomType] = useState('js');
  const [customName, setCustomName] = useState('');
  const fileRef = useRef(null);

  const fetchLangs = useCallback(async () => {
    try {
      const r = await fetch(`/wt/extensions/langs?category=${category}`);
      if (r.ok) setLangs(await r.json());
    } catch {}
  }, [category]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch('/wt/extensions/stats');
      if (r.ok) setStats(await r.json());
    } catch {}
  }, []);

  const fetchExtensions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category, lang: selLang, type: selType });
      const r = await fetch(`/wt/extensions/list?${params}`);
      if (r.ok) setExtensions(await r.json());
    } catch {
      setExtensions([]);
    } finally {
      setLoading(false);
    }
  }, [category, selLang, selType]);

  useEffect(() => { fetchLangs(); fetchStats(); }, []);
  useEffect(() => { fetchLangs(); }, [fetchLangs]);
  useEffect(() => { if (tab === 'browse') fetchExtensions(); }, [tab, category, selLang, selType]);

  const filtered = extensions.filter(e =>
    !query || e.name?.toLowerCase().includes(query.toLowerCase()) || e.lang?.includes(query.toLowerCase())
  );

  const loadExtension = async (ext) => {
    if (loadingId === ext.id) return;
    if (!ext.sourceCodeUrl) return alert('No source URL');
    setLoadingId(ext.id);
    try {
      const r = await fetch(`/wt/extensions/code?url=${encodeURIComponent(ext.sourceCodeUrl)}`);
      if (!r.ok) throw new Error('Failed to fetch');
      const { code } = await r.json();
      onExtensionLoad({ ...ext, code });
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.name.endsWith('.dart') ? 'dart' : 'js';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const name = file.name.replace(/\.(js|dart)$/, '').replace(/[-_]/g, ' ');
      onExtensionLoad({ code: ev.target.result, type, name, lang: 'custom', category: 'manga', iconUrl: '' });
    };
    reader.readAsText(file);
  };

  return (
    <aside className="flex flex-col w-64 shrink-0 bg-sidebar border-r border-sidebar-border overflow-hidden">
      {/* Tab switcher */}
      <div className="flex border-b border-sidebar-border">
        {[['browse', Globe, t('sidebar.browse')], ['local', FileCode, t('sidebar.local')]].map(([id, Icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
              tab === id ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            )}>
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Category pills */}
          <div className="flex gap-1 px-2 py-2 border-b border-sidebar-border overflow-x-auto">
            {CATEGORIES.map(({ id, label, icon: Icon }) => {
              const count = id === 'all'
                ? Object.values(stats).reduce((a, b) => a + b, 0)
                : stats[id] || 0;
              return (
                <button key={id} onClick={() => { setCategory(id); setSelLang('all'); }}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors',
                    category === id
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}>
                  <Icon size={11} />
                  {label}
                  {count > 0 && <span className="text-[9px] opacity-60">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="px-2 py-2 space-y-1.5 border-b border-sidebar-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                className="w-full bg-secondary rounded-md pl-7 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground/50 border border-border focus:outline-none focus:border-ring transition-colors"
                placeholder={t('sidebar.search')}
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              <select
                value={selType}
                onChange={e => setSelType(e.target.value)}
                className="flex-1 bg-secondary border border-border rounded-md px-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-ring"
              >
                <option value="all">{t('sidebar.all')}</option>
                <option value="js">JS</option>
                <option value="dart">Dart</option>
              </select>
              <select
                value={selLang}
                onChange={e => setSelLang(e.target.value)}
                className="flex-1 bg-secondary border border-border rounded-md px-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-ring"
              >
                <option value="all">{t('sidebar.all')}</option>
                {langs.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          {/* Extension list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-24 gap-2 text-muted-foreground">
                <Loader size={16} className="animate-spin text-primary/50" />
                <span className="text-xs">Loading…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 gap-1 text-muted-foreground">
                <span className="text-2xl">🔍</span>
                <span className="text-xs">{t('sidebar.noExtensions')}</span>
              </div>
            ) : (
              <>
                <p className="px-3 pt-2 pb-1 text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {t('sidebar.stats', { count: filtered.length })}
                </p>
                {filtered.map(ext => (
                  <ExtItem
                    key={ext.id}
                    ext={ext}
                    active={extension?.id === ext.id}
                    loading={loadingId === ext.id}
                    onClick={() => loadExtension(ext)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-sidebar-border flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground">watchtower-extensions</span>
            <button onClick={() => fetchExtensions()} disabled={loading}
              className="text-muted-foreground hover:text-foreground transition-colors" title={t('sidebar.refresh')}>
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      )}

      {tab === 'local' && (
        <div className="flex flex-col flex-1 p-3 gap-4 overflow-y-auto">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
              {t('sidebar.uploadFile')}
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all cursor-pointer"
            >
              <Upload size={18} />
              <span className="text-xs">.js or .dart</span>
            </button>
            <input ref={fileRef} type="file" accept=".js,.dart" className="hidden" onChange={handleFile} />
          </div>

          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {t('sidebar.pasteCode')}
              </p>
              <div className="flex gap-1">
                {['js', 'dart'].map(tp => (
                  <button key={tp} onClick={() => setCustomType(tp)}
                    className={cn('text-[10px] px-2 py-0.5 rounded font-semibold transition-colors',
                      customType === tp
                        ? tp === 'js' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}>
                    {tp.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <input
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring mb-2 transition-colors"
              placeholder={t('sidebar.extensionName')}
              value={customName}
              onChange={e => setCustomName(e.target.value)}
            />
            <textarea
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground/80 placeholder-muted-foreground focus:outline-none focus:border-ring resize-none flex-1 transition-colors"
              placeholder={`// Paste your ${customType.toUpperCase()} extension code`}
              value={customCode}
              onChange={e => setCustomCode(e.target.value)}
              style={{ minHeight: 120 }}
            />
            <button
              onClick={() => {
                if (!customCode.trim()) return;
                onExtensionLoad({ code: customCode, type: customType, name: customName || 'Custom', lang: 'custom', category: 'manga', iconUrl: '' });
              }}
              disabled={!customCode.trim()}
              className="mt-2 w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-colors hover:opacity-90 disabled:opacity-40"
            >
              {t('sidebar.loadExtension')}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
