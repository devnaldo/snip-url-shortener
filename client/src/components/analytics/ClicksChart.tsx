import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyClicks } from '../../api/types';
import { formatDay, formatNumber } from '../../lib/format';
import { useChartPalette } from '../../lib/use-chart-palette';

interface ClicksChartProps {
  data: DailyClicks[];
}

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

export function ClicksChart({ data }: ClicksChartProps) {
  const palette = useChartPalette();

  return (
    <div className="h-[220px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={{ fontSize: 10, fill: palette.axis, fontFamily: MONO }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            dy={4}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: palette.axis, fontFamily: MONO }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            labelFormatter={(label) => (typeof label === 'string' ? formatDay(label) : '')}
            formatter={(value) => [formatNumber(Number(value)), 'Clicks']}
            cursor={{ stroke: palette.line, strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 4,
              borderColor: palette.line,
              backgroundColor: palette.surface,
              color: palette.ink,
              fontSize: 11,
              fontFamily: MONO,
              boxShadow: palette.tooltipShadow,
            }}
            labelStyle={{ color: palette.muted, marginBottom: 2 }}
            itemStyle={{ color: palette.ink }}
          />
          <Line
            type="monotone"
            dataKey="clicks"
            name="Clicks"
            stroke={palette.accent}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: palette.accent }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
