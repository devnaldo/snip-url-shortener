import { CHART_PALETTES } from './chart-colors';
import type { ChartPalette } from './chart-colors';
import { useTheme } from '../theme/useTheme';

/** Theme-aware chart colours that re-render whenever the resolved theme changes. */
export function useChartPalette(): ChartPalette {
  const { resolvedTheme } = useTheme();
  return CHART_PALETTES[resolvedTheme];
}
