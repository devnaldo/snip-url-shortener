import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BrowserClicks } from '../../api/types';
import { formatNumber, truncateMiddle } from '../../lib/format';
import { useChartPalette } from '../../lib/use-chart-palette';

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface BrowserChartProps {
  data: BrowserClicks[];
}

export function BrowserChart({ data }: BrowserChartProps) {
  const palette = useChartPalette();

  if (data.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-subtle">
        No browser data yet
      </p>
    );
  }

  const height = Math.max(150, data.length * 34);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="browser"
            width={96}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: palette.muted, fontFamily: MONO }}
            tickFormatter={(value) => truncateMiddle(String(value), 16)}
          />
          <Tooltip
            formatter={(value) => [formatNumber(Number(value)), 'Clicks']}
            cursor={{ fill: palette.grid, fillOpacity: 0.5 }}
            contentStyle={{
              borderRadius: 4,
              borderColor: palette.line,
              backgroundColor: palette.surface,
              color: palette.ink,
              fontSize: 11,
              fontFamily: MONO,
              boxShadow: palette.tooltipShadow,
            }}
            itemStyle={{ color: palette.ink }}
          />
          <Bar dataKey="clicks" fill={palette.accent} radius={0} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
