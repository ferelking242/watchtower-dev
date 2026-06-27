import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Upload, Globe, ChevronDown, ChevronRight, Loader, RefreshCw, FileCode } from 'lucide-react';

export default function Sidebar({ onExtensionLoad, extension }) {
  const [tab, setTab]               = useState('browse'); // browse | local
  const [langs, setLangs]           = useState([]);
  const [selLang, setSelLang]       = useState('all');
  const [selType, setSelType]       = useState('all');
  const [query, setQuery]           = useState('');
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [loadingCode, setLoadingCode] = useState(null);
  const [customCode, setCustomCode] = useState('');
  const [customType, setCustomType] = useState('js');
  const [customName, setCustomName] = useState('My Extension');
  const fileRef = useRef(null);

  const fetchLangs = useCallback(async () => {
    try {
      const r = await fetch('/api/extensions/langs');
      if (r.ok) setLangs(await r.json());
    } catch {}
  }, []);

  const fetchExtensions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ lang: selLang, type: selType });
      const r = await fetch(`/api/extensions/list?${params}`);
      if (r.ok) {
        const data = await r.json();
        setExtensions(data);
      }
    } catch (err) {
      setExtensions([]);
    } finally {
      setLoading(false);
    }
  }, [selLang, selType]);

  useEffect(() => { fetchLangs(); }, [fetchLangs]);
  useEffect(() => { if (tab === 'browse') fetchExtensions(); }, [tab, selLang, selType, fetchExtensions]);

  const filtered = extensions.filter(e =>
    !query || e.id.toLowerCase().includes(query.toLowerCase()) || e.lang.includes(query)
  );

  const loadExtension = async (ext) => {
    if (loadingCode === ext.path) return;
    setLoadingCode(ext.path);
    try {
      const r = await fetch(`/api/extensions/code?path=${encodeURIComponent(ext.path)}`);
      if (!r.ok) throw new Error('Failed to fetch code');
      const { code } = await r.json();
      onExtensionLoad({ ...ext, code, name: ext.id });
    } catch (err) {
      alert(`Error loading extension: ${err.message}`);
    } finally {
      setLoadingCode(null);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.name.endsWith('.dart') ? 'dart' : 'js';
    const reader = new FileReader();
    reader.onload = (ev) => {
      onExtensionLoad({ code: ev.target.result, type, name: file.name, path: file.name, lang: 'unknown' });
    };
    reader.readAsText(file);
  };

  const loadCustom = () => {
    if (!customCode.trim()) return;
    onExtensionLoad({ code: customCode, type: customType, name: customName, path: 'custom', lang: 'custom' });
  };

  return (
    <aside className="flex flex-col w-64 shrink-0 bg-surface-1 border-r border-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-white/5">
        <div className="flex gap-1">
          {[['browse', Globe], ['local', FileCode]].map(([id, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === id ? 'bg-surface-3 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <Icon size={12} />
              {id === 'browse' ? 'Browse' : 'Local'}
            </button>
          ))}
        </div>
      </div>

      {/* Browse tab */}
      {tab === 'browse' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-3 py-2 space-y-2 border-b border-white/5">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2.5 text-gray-500" />
              <input
                className="input pl-7 text-xs py-1.5"
                placeholder="Search extensions…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select className="input text-xs py-1 flex-1" value={selType} onChange={e => setSelType(e.target.value)}>
                <option value="all">All types</option>
                <option value="js">JS</option>
                <option value="dart">Dart</option>
              </select>
              <select className="input text-xs py-1 flex-1" value={selLang} onChange={e => setSelLang(e.target.value)}>
                <option value="all">All langs</option>
                {langs.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button onClick={fetchExtensions} className="p-1.5 bg-surface-3 rounded-lg text-gray-400 hover:text-white transition-colors" title="Refresh">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-24">
                <Loader size={16} className="animate-spin text-accent-blue" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 text-xs py-8">No extensions found</div>
            ) : (
              <ul className="py-1">
                {filtered.map(ext => (
                  <li key={ext.path}>
                    <button
                      onClick={() => loadExtension(ext)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-surface-3 transition-colors group ${extension?.path === ext.path ? 'bg-accent-blue/10 text-accent-blue' : 'text-gray-300'}`}
                    >
                      {loadingCode === ext.path ? (
                        <Loader size={10} className="animate-spin shrink-0" />
                      ) : (
                        <span className={`tag tag-${ext.type} text-[10px]`}>{ext.type}</span>
                      )}
                      <span className="text-xs font-medium truncate flex-1">{ext.id}</span>
                      <span className="text-[10px] text-gray-600 shrink-0">[{ext.lang}]</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Local tab */}
      {tab === 'local' && (
        <div className="flex flex-col flex-1 overflow-hidden p-3 space-y-3">
          {/* File upload */}
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">Upload File</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-surface-4 rounded-xl py-4 text-gray-500 hover:border-accent-blue/40 hover:text-gray-300 transition-colors cursor-pointer"
            >
              <Upload size={18} />
              <span className="text-xs">.js or .dart file</span>
            </button>
            <input ref={fileRef} type="file" accept=".js,.dart" className="hidden" onChange={handleFile} />
          </div>

          {/* Paste code */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Paste Code</p>
              <div className="flex gap-1">
                {['js', 'dart'].map(t => (
                  <button key={t} onClick={() => setCustomType(t)}
                    className={`text-[10px] px-2 py-0.5 rounded ${customType === t ? `tag-${t}` : 'text-gray-600 bg-surface-3'}`}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <input
              className="input text-xs py-1 mb-2"
              placeholder="Extension name"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
            />
            <textarea
              className="input text-xs font-mono flex-1 resize-none leading-relaxed min-h-0"
              placeholder={`// Paste your ${customType === 'js' ? 'JavaScript' : 'Dart'} extension code here…\nclass DefaultExtension extends MProvider {\n  async getPopular(page) { … }\n}`}
              value={customCode}
              onChange={e => setCustomCode(e.target.value)}
              style={{ minHeight: 120 }}
            />
            <button onClick={loadCustom} className="btn-primary mt-2 justify-center text-xs py-1.5">
              Load Extension
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-2 border-t border-white/5 text-[10px] text-gray-600 text-center">
        watchtower-extensions · GitHub
      </div>
    </aside>
  );
}
