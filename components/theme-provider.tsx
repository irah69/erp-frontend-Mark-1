"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { designSystem } from "../config/design-system";

export type ThemeMode = "system" | "light" | "dark";
type ThemeContextValue = { mode: ThemeMode; setMode: (mode: ThemeMode) => void };
const ThemeContext = createContext<ThemeContextValue>({ mode: "system", setMode: () => {} });
const STORAGE_KEY = "solvane-theme";

function resolveTheme(mode: ThemeMode) {
  return mode === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;
}

function applyThemeVariables(theme: "light" | "dark") {
  const tokens = designSystem.themes[theme];
  const root = document.documentElement;
  for (const [name, value] of Object.entries(tokens)) root.style.setProperty(`--${name}`, value);
  designSystem.charts[theme].series.forEach((color, index) => root.style.setProperty(`--chart-${index + 1}`, color));
  for (const [status, color] of Object.entries(designSystem.charts[theme].statuses)) root.style.setProperty(`--chart-status-${status}`, color);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const apply = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    document.documentElement.dataset.themeMode = nextMode;
    const theme = resolveTheme(nextMode);
    document.documentElement.dataset.theme = theme;
    applyThemeVariables(theme);
    try { localStorage.setItem(STORAGE_KEY, nextMode); } catch {}
  }, []);

  useEffect(() => {
    let stored: ThemeMode = "system";
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (value === "light" || value === "dark" || value === "system") stored = value;
    } catch {}
    window.queueMicrotask(() => setModeState(stored));
    document.documentElement.dataset.themeMode = stored;
    const theme = resolveTheme(stored);
    document.documentElement.dataset.theme = theme;
    applyThemeVariables(theme);
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const nextTheme = resolveTheme("system");
      document.documentElement.dataset.theme = nextTheme;
      applyThemeVariables(nextTheme);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  return <ThemeContext.Provider value={{ mode, setMode: apply }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

export function ThemeSelector() {
  const { mode, setMode } = useTheme();
  const options = [
    { value: "system", label: "System", Icon: Monitor },
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
  ] as const;

  return (
    <div className="theme-control">
      <span className="theme-control-label">Appearance</span>
      <div className="appearance-options" role="group" aria-label="Color theme">
        {options.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            className="appearance-option"
            aria-label={`${label} appearance`}
            aria-pressed={mode === value}
            title={`${label} appearance`}
            onClick={() => setMode(value)}
          >
            <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
