import type { ResolvedTheme } from '../theme/theme-context';

/**
 * Charts need concrete colour values (SVG attributes cannot depend on CSS
 * variables reliably), so the palette mirrors the semantic tokens in one place.
 * Keep these in sync with `src/index.css`.
 */
export interface ChartPalette {
  accent: string;
  grid: string;
  axis: string;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  tooltipShadow: string;
  series: readonly string[];
}

export const CHART_PALETTES: Record<ResolvedTheme, ChartPalette> = {
  light: {
    accent: '#4f6b52',
    grid: '#e6e3dc',
    axis: '#6b6e66',
    ink: '#1f201d',
    muted: '#5f625b',
    surface: '#ffffff',
    line: '#e6e3dc',
    tooltipShadow: '0 8px 24px -12px rgb(31 32 29 / 0.28)',
    series: ['#4f6b52', '#2f6f6b', '#a8802b', '#a6553f', '#5c6470', '#6e5580', '#8b8d86'],
  },
  dark: {
    accent: '#a6c5a0',
    grid: '#2e2f29',
    axis: '#8b8d83',
    ink: '#f1f0e9',
    muted: '#a9aaa1',
    surface: '#191a17',
    line: '#2e2f29',
    tooltipShadow: '0 12px 32px -12px rgb(0 0 0 / 0.7)',
    series: ['#a6c5a0', '#7fb3ad', '#d6b26a', '#d08c74', '#9aa3b2', '#b39bc8', '#8b8d86'],
  },
};
