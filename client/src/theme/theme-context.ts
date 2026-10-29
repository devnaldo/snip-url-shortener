import { createContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** What the user picked: light, dark, or follow the operating system. */
  mode: ThemeMode;
  /** The mode actually applied right now (system resolves to light or dark). */
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

export const THEME_STORAGE_KEY = 'snip-theme';

export const ThemeContext = createContext<ThemeContextValue | null>(null);
