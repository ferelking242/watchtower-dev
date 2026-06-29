import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";
export type AccentColor = "blue" | "purple" | "green" | "orange" | "pink" | "red";

interface ThemeContextValue {
  mode: ThemeMode;
  accent: AccentColor;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentColor) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  accent: "blue",
  setMode: () => {},
  setAccent: () => {},
  toggle: () => {},
});

const ACCENT_VARS: Record<AccentColor, string> = {
  blue:   "#2563eb",
  purple: "#7c3aed",
  green:  "#16a34a",
  orange: "#ea580c",
  pink:   "#db2777",
  red:    "#dc2626",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => (localStorage.getItem("wt-theme") as ThemeMode) || "dark");
  const [accent, setAccentState] = useState<AccentColor>(() => (localStorage.getItem("wt-accent") as AccentColor) || "blue");

  const apply = (m: ThemeMode, a: AccentColor) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", m);
    root.style.setProperty("--accent", ACCENT_VARS[a]);
    root.style.setProperty("--accent-dim", ACCENT_VARS[a] + "33");
  };

  useEffect(() => { apply(mode, accent); }, [mode, accent]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem("wt-theme", m);
  };

  const setAccent = (a: AccentColor) => {
    setAccentState(a);
    localStorage.setItem("wt-accent", a);
  };

  const toggle = () => setMode(mode === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
