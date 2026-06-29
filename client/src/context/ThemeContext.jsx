import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({});

const ACCENT_COLORS = [
  { id: 'blue',    label: 'Blue',    class: 'accent-blue',    hex: '#3b82f6' },
  { id: 'violet',  label: 'Violet',  class: 'accent-violet',  hex: '#8b5cf6' },
  { id: 'red',     label: 'Red',     class: 'accent-red',     hex: '#ef4444' },
  { id: 'emerald', label: 'Emerald', class: 'accent-emerald', hex: '#10b981' },
  { id: 'orange',  label: 'Orange',  class: 'accent-orange',  hex: '#f97316' },
];

export function ThemeProvider({ children }) {
  const [mode, setMode]     = useState(() => localStorage.getItem('wt-mode') || 'dark');
  const [accent, setAccent] = useState(() => localStorage.getItem('wt-accent') || 'blue');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    const resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    root.classList.add(resolved);
    localStorage.setItem('wt-mode', mode);
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    ACCENT_COLORS.forEach(a => root.classList.remove(a.class));
    const found = ACCENT_COLORS.find(a => a.id === accent);
    if (found) root.classList.add(found.class);
    localStorage.setItem('wt-accent', accent);
  }, [accent]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent, ACCENT_COLORS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
